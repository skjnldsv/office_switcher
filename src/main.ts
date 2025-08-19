// SPDX-FileCopyrightText: 2025 John Molakvoæ <skjnldsv@protonmail.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Node, View } from '@nextcloud/files'
import { DefaultType, FileAction, getFileActions, registerFileAction } from '@nextcloud/files'
import { t } from '@nextcloud/l10n'

import mdiFileDocumentOutline from '@mdi/svg/svg/file-document-outline.svg?raw'

import { logger } from './logger'
import { execViewerAction, getActionForApp, getAppIconSvgString, getMimesForApp } from './actionUtils'

// The new actions
const actions = [] as FileAction[]

// Office apps to process
const apps = ['richdocuments', 'onlyoffice', 'officeonline', 'thinkfree']

// Existing actions to disable
const disabledActions = ['onlyoffice-open', 'onlyoffice-open-def', 'thinkfreeEditorAction']

// Register the actions for each app
apps.forEach((appName) => {
	const appSvg = getAppIconSvgString(appName)
	const mimes = getMimesForApp(appName)
	if (mimes.length === 0) {
		logger.debug(`No mimes nor registered action found for app ${appName}, skipping registration`)
		return
	}

	// Register the new action for the app
	const execViewer =  (file: Node, view: View, dir: string) => execViewerAction(file, view, dir, appName)
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
		exec: getActionForApp(appName)?.exec || execViewer,
	})
	registerFileAction(newAction)
	actions.push(newAction)

	logger.debug(`Action for app ${appName} registered successfully`, { action: newAction, mimes })
})

// Register the main action that will show the options
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
} else {
	logger.debug('No actions registered, skipping main office-switcher action registration')
}

// Disable existing actions that conflict with the new ones
disabledActions.forEach((actionId) => {
	const action = getFileActions().find(action => action.id === actionId)
	if (action) {
		Object.defineProperty(action, 'enabled', {
			get: () => () => false,
		})
		logger.debug(`Disabled action ${actionId} to avoid conflicts with office switcher`)
		return
	}

	logger.debug(`Action ${actionId} not found, cannot disable it`)
})
