import { AccountInfo } from '@azure/msal-browser'
import {
    IButtonStyles,
    Icon,
    IconButton,
    Modal,
    ProgressIndicator,
} from '@fluentui/react'
import { useBoolean } from '@fluentui/react-hooks'
import React, { useCallback, useEffect, useState } from 'react'
import { login, loginSilent, logout } from './api'
import './App.css'
import { NavigatorItem, Navigator } from './navigation'
import MigrationStatus from './pages/migrationStatus'
import NewMigration from './pages/newMigration'
import { ApiError } from './types'

const iconButtonStyles: Partial<IButtonStyles> = {
    root: {
        color: 'black',
        marginLeft: 'auto',
        marginTop: '4px',
        marginRight: '2px',
    },
    rootHovered: {
        color: 'black',
    },
}
export default function App() {
    const [expanded, { toggle: toggleCollapse }] = useBoolean(true)
    const [account, setAccount] = useState<AccountInfo | null>(null)
    const [pageShown, setPageShown] = useState<'new' | 'status'>('new')
    const [modalData, setModalData] = useState<{
        isOpen: boolean
        title: string
        message: string
    }>({ isOpen: false, title: '', message: '' })

    const loginToAzure = React.useCallback(async () => {
        let auth = await loginSilent()
        if (!auth) {
            auth = (await login()).account
        }
        setAccount(auth)
    }, [])

    const setErrorMessage = useCallback((err: ApiError) => {
        setModalData({ isOpen: true, message: err.message, title: err.title })
    }, [])

    useEffect(() => {
        if (!account) {
            loginToAzure()
        }
    }, [loginToAzure, account])

    return (
        <div className='container'>
            <div className='masthead'>
                <h4>Azure IoT Device Migrator</h4>
                <div className='center-vertical'>
                    {account && (
                        <>
                            <span className='spaced-right'>{account.name}</span>
                            <Icon
                                className='signOut'
                                iconName='SignOut'
                                onClick={async () => {
                                    await logout()
                                }}
                            />
                        </>
                    )}
                </div>
            </div>
            <div className='content'>
                <nav className={`nav`}>
                    <Navigator
                        expanded={expanded}
                        onItemSelected={(key) => {
                            setPageShown(key as any)
                        }}
                    >
                        <NavigatorItem
                            key='collapse'
                            title=''
                            icon={{ iconName: 'GlobalNavButton' }}
                            onClick={() => {
                                toggleCollapse()
                            }}
                        />
                        <NavigatorItem
                            key='new'
                            title='New migration'
                            icon={{ iconName: 'TurnRight' }}
                            onClick={() => {}}
                        />
                        <NavigatorItem
                            key='status'
                            title='Migration status'
                            icon={{ iconName: 'Sync' }}
                            onClick={() => {}}
                        />
                    </Navigator>
                </nav>
                {account ? (
                    pageShown === 'new' ? (
                        <NewMigration setErrorMessage={setErrorMessage} />
                    ) : (
                        <MigrationStatus setErrorMessage={setErrorMessage} />
                    )
                ) : (
                    <div className='page'>
                        <h3>Please wait</h3>
                        <ProgressIndicator label='Waiting for authentication' />
                    </div>
                )}
                <Modal
                    isOpen={modalData.isOpen}
                    onDismiss={() => {
                        setModalData((cur) => ({ ...cur, isOpen: false }))
                    }}
                >
                    <div className='flex vertical spaced-left spaced-right padding1'>
                        <div className='center-vertical'>
                            <h3 className=''>{modalData.title}</h3>
                            <IconButton
                                iconProps={{ iconName: 'Cancel' }}
                                styles={iconButtonStyles}
                                ariaLabel='Close popup modal'
                                onClick={() =>
                                    setModalData((cur) => ({
                                        ...cur,
                                        isOpen: false,
                                    }))
                                }
                            />
                        </div>
                        <span>{modalData.message}</span>
                    </div>
                </Modal>
            </div>
        </div>
    )
}
