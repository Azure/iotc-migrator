import './status.css';

import React from 'react';
import { DetailsList, DetailsRow, ConstrainMode, SelectionMode, IColumn } from '@fluentui/react/lib/DetailsList'
import { CommandBar, ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';
import axios from 'axios';
import usePromise from '../../hooks/usePromise';
import { AuthContext } from '../../context/authContext';
import { AppDataContext } from '../../context/appDataContext';
import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';

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
              id: job.id,
              name: job.displayName,
              dgroup: job.group,
              status: job.status
            })
          }
        }
        const cols = [
          { key: '1', name: 'Migration job name', fieldName: 'id', isResizable: true, minWidth: 150 },
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
  const appDataContext: any = React.useContext(AppDataContext);

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

  React.useEffect(() => {
    let timer: any = null;
    timer = setInterval(() => {
      fetch({ promiseFn: () => getJobs(authContext) });
    }, 10000);
    fetch({ promiseFn: () => getJobs(authContext) });
    return () => {
      clearInterval(timer);
    }
  }, [])

  React.useEffect(() => {
    if (!data) { return; }
    setTableData(data);
  }, [data])


  const _onRenderRow = (props: any) => {
    if (!props) { return null; }
    return <DetailsRow {...props} className='row' />;
  };

  const _onRenderItemColumn = (item: any, index: any, column: any) => {
    const node = null;
    if (column.fieldName === 'dgroup') {
      return <a target='_blank' href={`https://${authContext.applicationHost}.azureiotcentral.com/device-groups/${item[column.fieldName]}`}>{appDataContext.groups[item[column.fieldName]]}</a>;
    } else if (column.fieldName === 'id') {
      return <a target='_blank' href={`https://${authContext.applicationHost}.azureiotcentral.com/jobs/instances/${item[column.fieldName]}`}>{item['name']}</a>;
    } else {
      return <span>{item[column.fieldName]}</span>;
    }
  }

  return (
    <div className="workspace">
      <div className='workspace-container'>
        <CommandBar items={cmdBar} />
      </div>
      <div className="workspace-title">
        <h1>Migration status</h1>
        <p>{authContext.applicationHost} migration status.</p>
      </div>

      <div className="workspace-content">
        {loading ? <div className='status-progress'><ProgressIndicator /></div> : null}
        <div className={"workspace-table " + (loading ? '' : 'status-padding')}>
          <DetailsList
            compact={true}
            items={tableData.rows}
            columns={tableData.cols}
            selectionMode={SelectionMode.none}
            constrainMode={ConstrainMode.unconstrained}
            onRenderRow={_onRenderRow}
            onRenderItemColumn={_onRenderItemColumn}
            setKey="set"
          />
        </div>
      </div>
    </div>
  );
}

export default Status;