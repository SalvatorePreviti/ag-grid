const os = require('os');
const fs = require('fs');
const cp = require('child_process');
const path = require('path');
const rimraf = require('rimraf');
const express = require('express');
const realWebpack = require('webpack');
const proxy = require('express-http-proxy');
const webpackMiddleware = require('webpack-dev-middleware');
const chokidar = require('chokidar');
const generateExamples = require('./example-generator');
const buildPackagedExamples = require('./packaged-example-builder');
const getAllModules = require("./utils").getAllModules;

const lnk = require('lnk').sync;
const mkdirp = require('mkdir-p').sync;

const EXPRESS_PORT = 8080;
const PHP_PORT = 8888;
const HOST = '127.0.0.1';
const WINDOWS = /^win/.test(os.platform());

function addWebpackMiddleware(app, configFile, prefix) {
    const webpackConfig = require(path.resolve(`./webpack-config/${configFile}`));

    const compiler = realWebpack(webpackConfig);

    app.use(
        prefix,
        webpackMiddleware(compiler, {
            noInfo: true,
            logLevel: 'trace',
            publicPath: '/'
        })
    );
}

function launchPhpCP(app) {
    const php = cp.spawn('php', ['-S', `${HOST}:${PHP_PORT}`, '-t', 'src'], {
        stdio: ['ignore', 'ignore', 'ignore'],
        env: {AG_DEV: 'true'}
    });

    app.use(
        '/',
        proxy(`${HOST}:${PHP_PORT}`, {
            proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
                proxyReqOpts.headers['X-PROXY-HTTP-HOST'] = srcReq.headers.host;
                return proxyReqOpts;
            }
        })
    );

    process.on('exit', () => {
        php.kill();
    });
}

function serveAndWatchAngular(app) {
    const gulpPath = WINDOWS ? 'node_modules\\.bin\\gulp.cmd' : 'node_modules/.bin/gulp';

    const angularWatch = cp.spawn(gulpPath, ['watch'], {
        stdio: 'inherit',
        cwd: '../ag-grid-angular'
    });

    app.use('/dev/ag-grid-angular', express.static('../ag-grid-angular'));

    process.on('exit', () => {
        angularWatch.kill();
    });
}

function serveAndWatchVue(app) {
    const gulpPath = WINDOWS ? 'node_modules\\.bin\\gulp.cmd' : 'node_modules/.bin/gulp';

    const vueWatch = cp.spawn(gulpPath, ['watch'], {
        stdio: 'inherit',
        cwd: '../ag-grid-vue'
    });

    app.use('/dev/ag-grid-vue', express.static('../ag-grid-vue'));

    process.on('exit', () => {
        vueWatch.kill();
    });
}

function serveAndWatchModules(app, communityModules, enterpriseModules) {
    // spl modules
    const gulpPath = WINDOWS ? 'node_modules\\.bin\\gulp.cmd' : 'node_modules/.bin/gulp';

    const watchModule = (type, module) => {
        console.log(`watching module ${module.moduleDirName}`);

        // const moduleWatch = cp.spawn(gulpPath, ['watch'], {
        //     stdio: 'inherit',
        //     cwd: `${module.rootDir}`
        // });

        console.log(`/dev/${module.publishedName} - ./_dev/${module.publishedName}`);
        app.use(`/dev/${module.publishedName}`, express.static(`./_dev/${module.publishedName}`));

        // process.on('exit', () => {
        //     moduleWatch.kill();
        // });
    };

    communityModules.forEach(module => {
        watchModule('community', module);
    });
    enterpriseModules.forEach(module => {
        watchModule('enterprise', module);
    });
}

function launchTSCCheck() {
    const tscPath = WINDOWS ? 'node_modules\\.bin\\tsc.cmd' : 'node_modules/.bin/tsc';

    const tsChecker = cp.spawn(tscPath, ['--watch', '--noEmit']);

    tsChecker.stdout.on('data', data => {
        data
            .toString()
            .trim()
            .split('\n')
            .filter(line => line.indexOf('Watching for') === -1 && line.indexOf('File change') === -1)
            .filter(line => line.indexOf('__tests__') === -1 && line.indexOf('.test.') === -1 && line.indexOf('setupTests.ts') === -1)
            .filter(line => line.indexOf('Experimental') === -1)
            .forEach(line => console.log(line.replace('_dev', '..').replace('/dist/lib/', '/src/ts/')));
    });
}

function symlinkModules(communityModules, enterpriseModules) {
    // we delete the _dev folder each time we run now as we're constantly adding new modules etc
    // this saves us having to manually delete _dev each time
    if (fs.existsSync('_dev')) {
        rimraf.sync("_dev");
    }

    mkdirp('_dev/');
    mkdirp('_dev/@ag-community/');
    mkdirp('_dev/@ag-enterprise/');

    let linkType = 'symbolic';
    if (WINDOWS) {
        console.log('creating window links...');
        linkType = 'junction';
    }

    lnk('../ag-grid-react/', '_dev', {force: true, type: linkType});
    lnk('../ag-grid-angular/exports.ts', '_dev/ag-grid-angular/', {
        force: true,
        type: linkType,
        rename: 'main.ts'
    });
    lnk('../ag-grid-angular/', '_dev', {force: true, type: linkType});
    lnk('../ag-grid-vue/', '_dev', {force: true, type: linkType});

    // spl modules
    communityModules
        .forEach(module => {
            console.log(module.moduleDirName);
            lnk(module.fullPath, '_dev/', {
                force: true,
                type: linkType,
                rename: module.publishedName
            });
        });

    enterpriseModules
        .forEach(module => {
            lnk(module.fullPath, '_dev/', {
                force: true,
                type: linkType,
                rename: module.publishedName
            });
        });
    process.exit()
}

const exampleDirMatch = new RegExp('src/([-\\w]+)/');

function watchAndGenerateExamples(communityModules, enterpriseModules) {
    const callback = file => {
        let dir;
        if (file) {
            console.log(`${file} changed, regenerating`);
            try {
                dir = file.replace(/\\/g, '/').match(exampleDirMatch)[1];
            } catch (e) {
                throw new Error(`'${exampleDirMatch}' did not extract the example dir from '${file}'. Fix the regexp in dev-server.js`);
            }
        }
        console.log('regenerating examples...');
        generateExamples(() => console.log('generation done.'), 'javascript-grid-column-header', true, communityModules, enterpriseModules);
        // generateExamples(() => console.log('generation done.'), dir, true, communityModules, enterpriseModules);
    };

    callback();

    chokidar.watch('./src/*/*.php').on('change', callback);
    chokidar.watch('./src/*/*/*.{html,css,js}').on('change', callback);
}

function updateWebpackConfigWithBundles(communityModules, enterpriseModules) {
    console.log("updating webpack config with modules...");

    // spl modules
    const communityModulesEntries = communityModules
        .filter(module => module.moduleDirName !== 'grid-core')
        .filter(module => module.moduleDirName !== 'grid-all-modules')
        .map(module => `import "../../../${module.fullPath}";
import {${module.moduleName}} from "../../../${module.fullPath.replace('.ts', '')}"; 
        `);

    const communityRegisterModuleLines = communityModules
        .filter(module => module.moduleDirName !== 'grid-core')
        .filter(module => module.moduleDirName !== 'grid-all-modules')
        .map(module => `ModuleRegistry.register(${module.moduleName} as any);`);

    const enterpriseModulesEntries = enterpriseModules
        .filter(module => module.moduleDirName !== 'grid-core')
        .filter(module => module.moduleDirName !== 'grid-all-modules')
        .map(module => `import "../../../${module.fullPath}";
import {${module.moduleName}} from "../../../${module.fullPath.replace('.ts', '')}"; 
        `);

    const enterpriseRegisterModuleLines = enterpriseModules
        .filter(module => module.moduleDirName !== 'grid-core')
        .filter(module => module.moduleDirName !== 'grid-all-modules')
        .map(module => `ModuleRegistry.register(${module.moduleName} as any);`);

    const enterpriseBundleFilename = './src/_assets/ts/enterprise-grid-all-modules-umd.ts';
    const enterpriseMainFilename = './src/_assets/ts/ag-grid-enterprise-main.ts';
    const communityFilename = 'src/_assets/ts/community-grid-all-modules-umd.ts';

    const existingEnterpriseBundleLines = fs.readFileSync(enterpriseBundleFilename, 'UTF-8').split('\n');
    let modulesLineFound = false;
    const newEnterpriseBundleLines = [];
    existingEnterpriseBundleLines.forEach(line => {
        if (!modulesLineFound) {
            modulesLineFound = line.indexOf("/* MODULES - Don't delete this line */") !== -1;
            newEnterpriseBundleLines.push(line);
        }
    });
    const newEnterpriseBundleContent = newEnterpriseBundleLines.concat(enterpriseModulesEntries).concat(communityModulesEntries);
    fs.writeFileSync(enterpriseBundleFilename, newEnterpriseBundleContent.concat(enterpriseRegisterModuleLines).concat(communityRegisterModuleLines).join('\n'), 'UTF-8');

    const existingEnterpriseMainLines = fs.readFileSync(enterpriseMainFilename, 'UTF-8').split('\n');
    modulesLineFound = false;
    const newEnterpriseMainLines = [];
    existingEnterpriseMainLines.forEach(line => {
        if (!modulesLineFound) {
            modulesLineFound = line.indexOf("/* MODULES - Don't delete this line */") !== -1;
            newEnterpriseMainLines.push(line);
        }
    });
    const newEnterpriseMainContent = newEnterpriseMainLines.concat(enterpriseModulesEntries);
    fs.writeFileSync(enterpriseMainFilename, newEnterpriseMainContent.join('\n'), 'UTF-8');

    const existingCommunityLines = fs.readFileSync(communityFilename).toString().split('\n');
    modulesLineFound = false;
    const newCommunityLines = [];
    existingCommunityLines.forEach(line => {
        if (!modulesLineFound) {
            modulesLineFound = line.indexOf("/* MODULES - Don't delete this line */") !== -1;
            newCommunityLines.push(line);
        }
    });
    fs.writeFileSync(communityFilename, newCommunityLines.concat(communityModulesEntries).concat(communityRegisterModuleLines).join('\n'), 'UTF-8');
}

function updateSystemJsMappings(utilFileLines,
                                startString,
                                endString,
                                communityModules,
                                enterpriseModules,
                                communityMappingFunc,
                                enterpriseMappingFunc) {
    let foundStart = false;
    let foundEnd = false;

    const newUtilFileTop = [];
    const newUtilFileBottom = [];
    utilFileLines.forEach(line => {
        if (!foundStart) {
            newUtilFileTop.push(line);

            if (line.indexOf(startString) !== -1) {
                foundStart = true;
            }
        } else if (foundEnd) {
            newUtilFileBottom.push(line);
        } else if (foundStart && !foundEnd) {
            if (line.indexOf(endString) !== -1) {
                foundEnd = true;
                newUtilFileBottom.push(line);
            }
        }
    });

    const communityModuleEntries = communityModules.map(communityMappingFunc);
    const enterpriseModuleEntries = enterpriseModules.map(enterpriseMappingFunc);

    return newUtilFileTop.concat(communityModuleEntries).concat(enterpriseModuleEntries).concat(newUtilFileBottom);
}

function updateUtilsSystemJsMappingsForFrameworks(communityModules, enterpriseModules) {
    console.log("updating util.php -> systemjs mapping with modules...");

    // spl module
    const utilityFilename = 'src/example-runner/utils.php';
    const utilFileLines = fs.readFileSync(utilityFilename, 'UTF-8').split('\n');

    let updatedUtilFileLines = updateSystemJsMappings(utilFileLines,
        '/* START OF MODULES DEV - DO NOT DELETE */',
        '/* END OF MODULES DEV - DO NOT DELETE */',
        communityModules,
        enterpriseModules,
        module => `        "${module.publishedName}" => "$prefix/${module.publishedName}",`,
        module => `        "${module.publishedName}" => "$prefix/${module.publishedName}",`);

    updatedUtilFileLines = updateSystemJsMappings(updatedUtilFileLines,
        '/* START OF MODULES PROD - DO NOT DELETE */',
        '/* END OF MODULES PROD - DO NOT DELETE */',
        communityModules,
        enterpriseModules,
        // spl module - to test prior to release!!!
        module => `        "${module.publishedName}" => "https://unpkg.com/${module.publishedName}@" . AG_GRID_VERSION . "/",`,
        module => `        "${module.publishedName}" => "https://unpkg.com/${module.publishedName}@" . AG_GRID_ENTERPRISE_VERSION . "/",`);

    fs.writeFileSync(utilityFilename, updatedUtilFileLines.join('\n'), 'UTF-8');
}

function updateSystemJsBoilerplateMappingsForFrameworks(communityModules, enterpriseModules) {
    console.log("updating fw systemjs boilerplate config with modules...");

    // spl module
    const systemJsFiles = [
        './src/example-runner/angular-boilerplate/systemjs.config.js',
        './src/example-runner/react-boilerplate/systemjs.config.js',
        './src/example-runner/vue-boilerplate/systemjs.config.js'];

    systemJsFiles.forEach(systemJsFile => {
        const fileLines = fs.readFileSync(systemJsFile, 'UTF-8').split('\n');

        let updateFileLines = updateSystemJsMappings(fileLines,
            '/* START OF MODULES - DO NOT DELETE */',
            '/* END OF MODULES - DO NOT DELETE */',
            communityModules,
            enterpriseModules,
            module => `           '${module.publishedName}': { 
                main: './dist/cjs/main.js',
                defaultExtension: 'js'
            },`,
            module => `           '${module.publishedName}': { 
                main: './dist/cjs/main.js',
                defaultExtension: 'js'
            },`);

        fs.writeFileSync(systemJsFile, updateFileLines.join('\n'), 'UTF-8');
    })
}

module.exports = () => {
    const app = express();

    // necessary for plunkers
    app.use(function (req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        return next();
    });

    const {communityModules, enterpriseModules} = getAllModules();
    updateWebpackConfigWithBundles(communityModules, enterpriseModules);

    // serve community, enterprise and react

    // for js examples that just require community functionality (landing pages, vanilla community examples etc)
    // webpack.community-grid-all.config.js -> AG_GRID_SCRIPT_PATH -> //localhost:8080/dev/@ag-community/grid-all-modules/dist/ag-grid-community.js
    // addWebpackMiddleware(app, 'webpack.community-grid-all-umd.config.js', '/dev/@ag-community/grid-all-modules/dist');

    // for js examples that just require enterprise functionality (landing pages, vanilla enterprise examples etc)
    // webpack.community-grid-all.config.js -> AG_GRID_SCRIPT_PATH -> //localhost:8080/dev/@ag-enterprise/grid-all-modules/dist/ag-grid-enterprise.js
    // addWebpackMiddleware(app, 'webpack.enterprise-grid-all-umd.config.js', '/dev/@ag-enterprise/grid-all-modules/dist');

    // addWebpackMiddleware(app, 'webpack.enterprise.config.js', '/dev/ag-grid-enterprise');

    // for the actual site - php, css etc
    // addWebpackMiddleware(app, 'webpack.site.config.js', '/dist');

    // addWebpackMiddleware(app, 'webpack.react.config.js', '/dev/ag-grid-react');

    // spl modules
    // add community & enterprise modules to express (for importing in the fw examples)
    symlinkModules(communityModules, enterpriseModules);
    updateUtilsSystemJsMappingsForFrameworks(communityModules, enterpriseModules);
    updateSystemJsBoilerplateMappingsForFrameworks(communityModules, enterpriseModules);
    serveAndWatchModules(app, communityModules, enterpriseModules);

    // angular & vue are separate processes
    serveAndWatchAngular(app);
    // serveAndWatchVue(app);

    // build "packaged" landing page examples (for performance reasons)
    // these aren't watched and regenerated like the other examples
    // commented out by default - add if you want to test as part of the dev build (or run separately - see at the end of the file)
    // buildPackagedExamples(() => console.log("Packaged Examples Built")); // scope - for eg react-grid

    // regenerate examples
    watchAndGenerateExamples(communityModules, enterpriseModules);

    // PHP
    launchPhpCP(app);

    // Watch TS for errors. No actual transpiling happens here, just errors
    // launchTSCCheck(communityModules, enterpriseModules);

    app.listen(EXPRESS_PORT, function () {
        console.log(`ag-Grid dev server available on http://${HOST}:${EXPRESS_PORT}`);
    });
};

//     node dev-server.js generate-examples [src directory]
// eg: node dev-server.js generate-examples javascript-grid-accessing-data
const genExamples = (exampleDir) => {
    return () => {
        console.log('regenerating examples...');
        const {communityModules, enterpriseModules} = getAllModules();
        generateExamples(() => console.log('generation done.'), exampleDir, true, communityModules, enterpriseModules);
    };
};

// dont remove these unused vars
const [cmd, script, execFunc, exampleDir, watch] = process.argv;
if (process.argv.length >= 3) {
    if (execFunc === 'generate-examples') {
        if (exampleDir && watch) {
            const examplePath = path.resolve('./src/', exampleDir);
            chokidar.watch(`${examplePath}/**/*`, {ignored: ['**/_gen/**/*']}).on('change', genExamples(exampleDir));
        } else {
            console.log('regenerating examples...');
            const {communityModules, enterpriseModules} = getAllModules();
            generateExamples(() => console.log('generation done.'), exampleDir, true, communityModules, enterpriseModules);
        }
    } else if (execFunc === 'prebuild-examples') {
        buildPackagedExamples(() => console.log("Packaged Examples Built"), exampleDir || undefined);
    }
}

