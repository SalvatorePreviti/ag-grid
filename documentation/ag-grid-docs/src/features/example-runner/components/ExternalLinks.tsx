import type { InternalFramework } from '@ag-grid-types';
import { OpenInCodeSandbox } from '@features/codeSandbox/components/OpenInCodeSandbox';
import type { FileContents } from '@features/example-generator/types';
import { OpenInPlunkr } from '@features/plunkr/components/OpenInPlunkr';

export function ExternalLinks({
    title,
    internalFramework,
    exampleFiles,
    exampleBoilerPlateFiles,
    packageJson,
    initialSelectedFile,
    plunkrHtmlUrl,
    codeSandboxHtmlUrl,
}: {
    title: string;
    internalFramework: InternalFramework;
    exampleFiles?: FileContents;
    exampleBoilerPlateFiles?: FileContents;
    packageJson?: Record<string, any>;
    initialSelectedFile?: string;

    plunkrHtmlUrl?: string;
    codeSandboxHtmlUrl?: string;
}) {
    return (
        <>
            {codeSandboxHtmlUrl && exampleFiles ? (
                <li>
                    <OpenInCodeSandbox
                        title={title}
                        files={exampleFiles}
                        htmlUrl={codeSandboxHtmlUrl}
                        internalFramework={internalFramework}
                        boilerPlateFiles={exampleBoilerPlateFiles}
                        packageJson={packageJson!}
                    />
                </li>
            ) : undefined}
            {plunkrHtmlUrl && exampleFiles ? (
                <li>
                    <OpenInPlunkr
                        title={title}
                        files={exampleFiles}
                        htmlUrl={plunkrHtmlUrl}
                        boilerPlateFiles={exampleBoilerPlateFiles}
                        packageJson={packageJson!}
                        fileToOpen={initialSelectedFile!}
                    />
                </li>
            ) : undefined}
        </>
    );
}
