import { FontWeights, Icon, IIconProps } from '@fluentui/react'
import { useBoolean } from '@fluentui/react-hooks'
import React, { MouseEventHandler, useState } from 'react'

export interface NavigatorItemProps {
    icon?: IIconProps
    key: string
    title: string
    text?: string
    onClick: MouseEventHandler<HTMLLIElement>
}

const NavigatorItemStyle = {
    li: {
        listStyleType: 'none',
        paddingTop: 3,
        paddingBottom: 3,
        paddingLeft: '1em',
        height: 40,
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
    },
    selected: {
        backgroundColor: 'white',
        fontWeight: FontWeights.semibold,
    },
    icon: {
        paddingRight: 15,
        fontSize: 16,
    },
    text: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    } as React.CSSProperties,
}

export const NavigatorItem: React.FC<NavigatorItemProps> = () => null

const NavigatorItemInternal: React.FC<
    NavigatorItemProps & { selected: boolean }
> = ({ icon, title, onClick, selected }) => {
    const [hover, { toggle: toggleHover }] = useBoolean(false)
    return (
        <li
            style={{
                ...NavigatorItemStyle.li,
                ...(selected ? NavigatorItemStyle.selected : {}),
                ...(hover ? { backgroundColor: '#dadada' } : {}),
            }}
            onClick={onClick}
            onMouseEnter={toggleHover}
            onMouseLeave={toggleHover}
        >
            {icon && <Icon style={NavigatorItemStyle.icon} {...icon} />}
            <span style={NavigatorItemStyle.text}>{title}</span>
        </li>
    )
}

const NavigatorStyle = {
    expanded: {
        width: 200,
        height: '100%',
        paddingLeft: 0,
        margin: 0,
        transition: 'width 0.2s',
    },
    collapsed: {
        width: '3rem',
        height: '100%',
        paddingLeft: 0,
        margin: 0,
        transition: 'width 0.2s',
    },
}
interface INavigatorProps {
    children:
        | React.ReactElement<NavigatorItemProps>
        | React.ReactElement<NavigatorItemProps>[]
    onItemSelected: (itemKey: string) => void
    expanded?: boolean
}

export const Navigator = ({
    children,
    onItemSelected,
    expanded = true,
}: INavigatorProps) => {
    const [selected, setSelected] = useState(1)
    return (
        <ul style={NavigatorStyle[expanded ? 'expanded' : 'collapsed']}>
            {Array.isArray(children)
                ? children.map((item, idx) => {
                      const { onClick: onItemClick, ...otherProps } = item.props
                      return (
                          <NavigatorItemInternal
                              {...otherProps}
                              onClick={(e) => {
                                  if (idx !== 0) {
                                      setSelected(idx)
                                  }
                                  onItemClick(e)
                                  onItemSelected(item.key as any)
                              }}
                              selected={selected === idx}
                              key={`navitem-${idx}`}
                          />
                      )
                  })
                : children}
        </ul>
    )
}
