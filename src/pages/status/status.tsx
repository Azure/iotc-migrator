import './status.css';

import React from 'react';
import { DetailsList, ConstrainMode, SelectionMode } from '@fluentui/react/lib/DetailsList'

function Status() {
  const [tableData, setTableData] = React.useState({
    cols: [
      { key: '1', name: 'Name', fieldName: 'name', isResizable: true, minWidth: 100 },
      { key: '2', name: 'Device group', fieldName: 'dgroup', isResizable: true, minWidth: 150 },
      { key: '3', name: 'Target', fieldName: 'target', isResizable: true, minWidth: 150 },
      { key: '4', name: 'Status', fieldName: 'status', isResizable: true, minWidth: 150 },
      { key: '5', name: 'Total devices', fieldName: 'totalDevices', isResizable: true, minWidth: 150 },
      { key: '6', name: 'Migrated devices', fieldName: 'migratedDevices', isResizable: true, minWidth: 150 },
      { key: '7', name: 'Start date', fieldName: 'startDate', isResizable: true, minWidth: 200 },
      { key: '8', name: 'End data', fieldName: 'endDate', isResizable: true, minWidth: 200 },
    ],
    rows: [
      { key: '1', name: 'Migration 1', dgroup: 'Group One', target: 'DPS 1', status: 'Completed', totalDevices: '1,000,000', migratedDevices: '500', startDate: '4/28/2020, 1:52:35 PM', endDate: '4/28/2020, 1:52:35 PM' },
      { key: '2', name: 'Migration 2', dgroup: 'Group Two', target: 'DPS 1', status: 'Running', totalDevices: '1,000,000', migratedDevices: '10', startDate: '4/28/2020, 1:52:35 PM', endDate: '4/28/2020, 1:52:35 PM' },
      { key: '3', name: 'Migration 3', dgroup: 'Group Three', target: 'App 4', status: 'Failed', totalDevices: '1,000,000', migratedDevices: '2342', startDate: '4/28/2020, 1:52:35 PM', endDate: '4/28/2020, 1:52:35 PM' },
    ]
  });

  return (
    <div className="workspace">
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
            setKey="set"
          />
        </div>
      </div>
    </div>
  );
}

export default Status;