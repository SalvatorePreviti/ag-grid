import React from 'react';
import { IconName, Icon } from '../../Icon';
import styles from '@design-system/modules/ComparisonTableRenderers.module.scss';

export function Label({ value }: { value: { name: string; icon?: string; link: string; } }) {
    const iconName:IconName = value.icon;

    return <div className={styles.label}>
        <a href={value.link}>
            {iconName && <Icon name={iconName}/>} 
            {value.name}
        </a>
    </div>;
}