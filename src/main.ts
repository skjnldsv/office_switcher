// SPDX-FileCopyrightText: 2025 John Molakvoæ <skjnldsv@protonmail.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Node, View } from '@nextcloud/files'
import { DefaultType, FileAction, getFileActions, registerFileAction } from '@nextcloud/files'
import { t } from '@nextcloud/l10n'

import mdiFileDocumentOutline from '@mdi/svg/svg/file-document-outline.svg?raw'

import { logger } from './logger'
import { execViewerAction, getActionForApp, getAppIconSvgString, getMimesForApp } from './actionUtils'

const apps = ['richdocuments', 'onlyoffice', 'officeonline', 'thinkfree']
const actions = [] as FileAction[]
apps.forEach(async (appName) => {
	const action = getActionForApp(appName)
	const appSvg = await getAppIconSvgString(appName)

	if (action) {
		// Register the action with the office switcher
		const newAction = new FileAction({
			id: `office-switcher-${appName}`,
			displayName: () => t('office_switcher', `Open with ${appName}`),
			enabled: action.enabled,
			iconSvgInline: () => appSvg,
			exec: action.exec,
			parent: 'office-switcher',
		})
		registerFileAction(newAction)
		actions.push(newAction)

		// Disable the original action to prevent conflicts
		// @ts-expect-error readonly property
		action.enabled = () => false // Disable the ThinkFree action

		logger.debug(`Action for app ${appName} registered successfully`)
		return
	}
	logger.debug(`No action found for app ${appName}, falling back to viewer handlers`)

	const mimes = getMimesForApp(appName)
	if (mimes.length === 0) {
		logger.debug(`No mimes found for app ${appName}, skipping registration`)
		return
	}

	// Register the viewer action for the app
	const newAction = new FileAction({
		id: `office-switcher-viewer-${appName}`,
		displayName: () => t('office_switcher', `Open with ${appName}`),
		iconSvgInline: () => appSvg,
		enabled: (nodes: Node[]) => {
			if (!nodes[0] || nodes.length !== 1) {
				return false
			}
			const node = nodes[0]
			return mimes.includes(node.mime)
		},
		parent: 'office-switcher',
		exec: execViewerAction,
	})
	registerFileAction(newAction)
	actions.push(newAction)

	logger.debug(`Viewer action for app ${appName} registered successfully`)
})

if (actions.length !== 0) {
	registerFileAction(new FileAction({
		id: 'office-switcher',
		displayName: () => t('office_switcher', 'Open with'),
		iconSvgInline: () => mdiFileDocumentOutline,
		order: -99999,

		enabled: (nodes: Node[], view: View) => {
			return actions.some(action => action.enabled!(nodes, view))
		},

		async exec() {
			return null
		}
	}))
}