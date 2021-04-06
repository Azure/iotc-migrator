import './newMigration.css';
import React from 'react';

import { TextField } from '@fluentui/react/lib/TextField';
import { ChoiceGroup, IChoiceGroupOption } from '@fluentui/react/lib/ChoiceGroup';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { PrimaryButton } from '@fluentui/react';
import { CommandBar, ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';

import { getTextFieldStyles, dropdownStyles } from '../../styles/fluentStyles';

const options: IChoiceGroupOption[] = [
  { key: "1", text: 'Move to another Azure IoT Central application' },
  { key: "2", text: 'Move to your own Azure IoT Hub' },
];

const apps: IDropdownOption[] = [
  { key: '324234-234-234-243-324', text: 'Application 1' },
  { key: '324234-234-234-243-325', text: 'Application 2' },
  { key: '324234-234-234-243-326', text: 'Application 3' },
];

const dps: IDropdownOption[] = [
  { key: '224234-234-234-243-324', text: 'DPS 1' },
  { key: '224234-234-234-243-325', text: 'DPS 2' },
];

const groups: IDropdownOption[] = [
  { key: '124234-234-234-243-324', text: 'Group 1' },
  { key: '124234-234-234-243-325', text: 'Group 2' },
];

function NewMigration() {

  const [appCopy, setAppCopy] = React.useState<string>('1');

  const changeMode = (e?: React.FormEvent<HTMLElement>, item?: IChoiceGroupOption) => {
    setAppCopy(item?.key || '1');
  }

  const cmdBar: ICommandBarItemProps[] = React.useMemo(() => [{
    key: '1',
    text: 'Migrate',
    iconProps: {
      iconName: 'TurnRight'
    },
    onClick: () => { },
    disabled: false
  }], []);

  return (
    <div className="workspace">
      <div className='workspace-container'>
        <CommandBar items={cmdBar} />
      </div>
      <div className="workspace-title">
        <h1>New migration</h1>
        <p>Move devices from App 1 to another Azure IoT Central application or to your own Azure IoT Hub.</p>
      </div>
      <div className="workspace-content">
        <div className="workspace-narrow">
          <div className='field-group'>
            <div className='text-field'>
              <TextField autoComplete='off' styles={getTextFieldStyles} label="Name" name='name' value='' onChange={() => { }} required={true} />
            </div>
          </div>
          <div className='field-group'>
            <h2>Migration options</h2>
            <ChoiceGroup defaultSelectedKey={appCopy} value={appCopy} options={options} onChange={changeMode} label="Pick one" required={true} />
          </div>

          <div className='field-group'>
            <h2>Migration target</h2>
            {appCopy !== "1" ? <>
              <p>Choose the Device Provisioning Service (DPS) linked to an Azure IoT Hub where the devices will be moved.</p>
              <Dropdown
                required={true}
                placeholder="Select a DPS"
                label="Target DPS"
                options={dps}
                styles={dropdownStyles}
              />
            </>
              :
              <>
                <p>Choose the target application where the devices will be moved.</p>
                <Dropdown
                  required={true}
                  placeholder="Select an application"
                  label="Target application"
                  options={apps}
                  styles={dropdownStyles}
                />
              </>
            }
          </div>

          <div className='field-group'>
            <h2>Target devices</h2>
            <p>Choose the device group containing the devices to migrate.</p>
            <Dropdown
              required={true}
              placeholder="Select a device group"
              label="Device group"
              options={groups}
              styles={dropdownStyles}
            />
            <br />
            <p>0 devices</p>
          </div>

          {appCopy !== "1" ? null : <div className='field-group'>
            <h2>Device template</h2>
            <Checkbox label="Copy the associated device template" onChange={() => { }} />
          </div>}

          <div className='field-group'>
            <PrimaryButton onClick={() => { }} text="Migrate" />
          </div>

        </div>
      </div>
    </div >
  );
}

export default NewMigration;
