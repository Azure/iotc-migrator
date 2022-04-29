import { ITextFieldStyleProps, ITextFieldStyles } from '@fluentui/react/lib/TextField';
import { IDropdownStyles } from '@fluentui/react/lib/Dropdown';

// this is required to style Office Fabric
export function getTextFieldStyles(props: ITextFieldStyleProps): Partial<ITextFieldStyles> {
    return {
        fieldGroup: [{
            border: (props.focused ? '1px solid #136bfb' : '1px solid #cdcdcd'),
            selectors: {
                ":hover": {
                    border: '1px solid #136bfb',
                }
            },
            width: 400,
        }]
    };
}

export const dropdownStyles: Partial<IDropdownStyles> = {
    dropdown: {
        width: 400,
    },
};