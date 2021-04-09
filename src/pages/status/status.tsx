import './status.css';

import React from 'react';
import { DetailsList, DetailsRow, ConstrainMode, SelectionMode } from '@fluentui/react/lib/DetailsList'
import { CommandBar, ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';
import axios from 'axios';
import usePromise from '../../hooks/usePromise';
import { AuthContext } from '../../context/authContext';

function getJobs(authContext: any) {
  return new Promise(async (resolve, reject) => {
    const token = await authContext.getAccessToken();
    const groups: any = [];
    axios(`https://${authContext.applicationHost}/api/preview/jobs`, { headers: { 'Authorization': 'Bearer ' + token } })
      .then((res: any) => {
        const rows: any = [];
        for (const i in res.data.value) {
          const job = res.data.value[i];
          if (job.description && job.description.startsWith('AUTOMATED-DEVICE-MOVE')) {
            rows.push({
              key: i,
              name: job.displayName,
              dgroup: job.group,
              status: job.status
            })
          }
        }
        const cols = [
          { key: '1', name: 'Name', fieldName: 'name', isResizable: true, minWidth: 100 },
          { key: '2', name: 'Device group', fieldName: 'dgroup', isResizable: true, minWidth: 150 },
          { key: '3', name: 'Status', fieldName: 'status', isResizable: true, minWidth: 150 }
        ]
        resolve({ rows, cols });
      })
      .catch((err) => {
        reject(err);
      });
  })
}

function Status() {
  const authContext: any = React.useContext(AuthContext);

  const [tableData, setTableData] = React.useState({ cols: [], rows: [] });
  const [loading, data, error, fetch] = usePromise();

  const cmdBar: ICommandBarItemProps[] = React.useMemo(() => [{
    key: '1',
    text: 'Refresh',
    iconProps: {
      iconName: 'Refresh'
    },
    onClick: () => { fetch({ promiseFn: () => getJobs(authContext) }); },
    disabled: false
  }], []);

  const _onRenderRow = (props: any) => {
    if (!props) { return null; }
    return <DetailsRow {...props} className='row' />;
  };

  React.useEffect(() => {
    let timer: any = null;
    timer = setInterval(() => {
      fetch({ promiseFn: () => getJobs(authContext) });
    }, 5000);
    return () => {
      clearInterval(timer);
    }
  }, [])

  React.useEffect(() => {
    if (!data) { return; }
    setTableData(data);
  }, [data])

  return (
    <div className="workspace">
      <div className='workspace-container'>
        <CommandBar items={cmdBar} />
      </div>
      <div className="workspace-title">
        <h1>Migration status</h1>
        <p>App 1 migration status.</p>
      </div>
      <div className="workspace-content">
        <div className="workspace-table">
          <DetailsList
            compact={true}
            items={tableData.rows}
            columns={tableData.cols}
            selectionMode={SelectionMode.none}
            constrainMode={ConstrainMode.unconstrained}
            onRenderRow={_onRenderRow}
            setKey="set"
          />
        </div>
      </div>
    </div>
  );
}

export default Status;