import classnames from 'classnames/bind';

import React from 'react';
import { DetailsList, DetailsRow, ConstrainMode, SelectionMode, MessageBar, MessageBarType } from '@fluentui/react'
import { CommandBar, ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';
import usePromise from '../../hooks/usePromise';
import { AuthContext } from '../../context/authContext';
import { AppDataContext } from '../../context/appDataContext';
import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';
import { Col, getJobs, Row } from '../../iotcAPI';
const cx = classnames.bind(require('./status.scss'));

function Status() {
  const authContext: any = React.useContext(AuthContext);
  const appDataContext: any = React.useContext(AppDataContext);

  const [tableData, setTableData] = React.useState<{ rows: Row[], cols: Col[] }>({ cols: [], rows: [] });
  const [loading, data, error, fetch] = usePromise();

  const cmdBar: ICommandBarItemProps[] = React.useMemo(() => [{
    key: '1',
    text: 'Refresh',
    iconProps: {
      iconName: 'Refresh'
    },
    onClick: () => { fetch({ promiseFn: () => getJobs(authContext) }); },
    disabled: false
    // eslint-disable-next-line
  }], []);


  React.useEffect(() => {
    const intervalId = setInterval(async () => {
      const response = await fetch({ promiseFn: () => getJobs(authContext) });
      if (!!response) {
        setTableData(response);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [setTableData, fetch, authContext]);

  React.useEffect(() => {
    if (!data) { return; }
    setTableData(data);
  }, [data])

  const _onRenderRow = (props: any) => {
    if (!props) {
      return null;
    }
    return <DetailsRow {...props} className={cx('row')} />;
  };

  const _onRenderItemColumn = (item: any, _index, column: any) => {
    switch (column.fieldName) {
      case 'dgroup':
        return <a target='_blank' rel='noreferrer' href={`https://${authContext.applicationHost}/device-groups/${item[column.fieldName]}`}>
          {appDataContext.groups[item[column.fieldName]]}
        </a>;
      case 'id':
        return <a target='_blank' rel='noreferrer' href={`https://${authContext.applicationHost}/jobs/instances/${item[column.fieldName]}`}>
          {item['name']}
        </a>;
      default:
        return <span>{item[column.fieldName]}</span>;
    }
  }

  return (
    <div className={cx('workspace')}>
      <CommandBar className={cx('action-bar')} items={cmdBar} />
      {error && <MessageBar
        messageBarType={MessageBarType.error}
        isMultiline={true}>
        <p>{JSON.stringify(error?.response?.data?.error?.message || error.message || 'Something went wrong. Please try again')}</p>
      </MessageBar>}
      <div className={cx('status-progress')}>{!!loading && <ProgressIndicator />}</div>
      <div className={cx('workspace-container')}>
        <div className={cx('workspace-title')}>
          <h1 className={cx('title')}>Migration status</h1>
          <p>{authContext.applicationHost} migration status.</p>
        </div>
        <div className={cx('workspace-content')}>
          <div className={cx('workspace-table', { 'status-padding': loading })}>
            {tableData.rows.length
              ? <DetailsList
                compact={true}
                items={tableData.rows}
                columns={tableData.cols}
                selectionMode={SelectionMode.none}
                constrainMode={ConstrainMode.unconstrained}
                onRenderRow={_onRenderRow}
                onRenderItemColumn={_onRenderItemColumn}
                setKey='set'
                className={cx('table')}
              />
              : <div className={cx('no-data')}>No migration found</div>
            }
          </div>
        </div>

      </div>
    </div>
  );
}

export default Status;