// SPDX-FileCopyrightText: 2025 John Molakvoæ <skjnldsv@protonmail.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Node, View } from '@nextcloud/files'

import { emit } from '@nextcloud/event-bus'
import { FileAction, getFileActions } from '@nextcloud/files'
import { generateFilePath } from '@nextcloud/router'
import { getCapabilities } from '@nextcloud/capabilities'
import { loadState } from '@nextcloud/initial-state'
import axios from '@nextcloud/axios'

export async function getAppIconSvgString(appName: string): Promise<string> {
	const response = await axios.get(generateFilePath(appName, '', 'img/app.svg'), {
		headers: {
			'Content-Type': 'image/svg+xml',
		},
	})

	if (response.status !== 200) {
		throw new Error(`Failed to fetch app icon for ${appName}: ${response.statusText}`)
	}

	return response.data
}


export function getActionForApp(appName: string): FileAction | null {
	const actions = getFileActions()
	return actions.find(action => action.id.toLowerCase().includes(appName.toLowerCase())) || null
}

/**
 * From https://github.com/nextcloud/viewer/blob/d531abe602996292c8c0c45d0c525afcdc58bea6/src/files_actions/viewerAction.ts#L17
 */
function pushToHistory(node: Node, view: View, dir: string) {
	const editing = window.OCP.Files.Router.query.editing === 'true' ? 'true' : 'false'
	window.OCP.Files.Router.goToRoute(
		null,
		{ view: view.id, fileid: String(node.fileid) },
		{ dir, openfile: 'true', editing },
		true,
	)
}

function onPopState() {
	emit('editor:toggle', window.OCP.Files.Router.query?.editing === 'true')
	if (window.OCP.Files.Router.query.openfile !== 'true') {
		window.OCA.Viewer.close()
		window.removeEventListener('popstate', onPopState)
	}
}

/**
 * From https://github.com/nextcloud/viewer/blob/d531abe602996292c8c0c45d0c525afcdc58bea6/src/files_actions/viewerAction.ts#L48
 */
export async function execViewerAction(node: Node, view: View, dir: string): Promise<boolean|null> {
	const onClose = () => {
		// This can sometime be called with the openfile set to true already. But we don't want to keep openfile when closing the viewer.
		const newQuery = { ...window.OCP.Files.Router.query }
		delete newQuery.openfile
		delete newQuery.editing
		window.OCP.Files.Router.goToRoute(null, window.OCP.Files.Router.params, newQuery)
	}

	window.addEventListener('popstate', onPopState)

	pushToHistory(node, view, dir)
	window.OCA.Viewer.open({
		path: node.path,
		onPrev(fileInfo) {
			pushToHistory(fileInfo, view, dir)
		},
		onNext(fileInfo) {
			pushToHistory(fileInfo, view, dir)
		},
		onClose,
	})

	return null
}

/**
 * See https://github.com/nextcloud/richdocuments/blob/89edc34974b72aca11f041978b8eb773c806f09e/src/viewer.js#L12-L26
 */
function getRichDocumentMimes(): string[] {
	return getCapabilities()?.richdocuments?.mimetypes || []
}

/**
 * See https://github.com/ONLYOFFICE/onlyoffice-nextcloud/blob/75ebce83f15f992d17166e9c30a116ebbe0bbba3/src/viewer.js#L95-L100
 */
function getOnlyOfficeMimes(): string[] {
	const formats = loadState('onlyoffice', 'settings', {})?.formats || {}
	return Object.values(formats).filter((format: any) => format.def).map((format: any) => format.mime).flat()
}

/**
 * See https://github.com/nextcloud/officeonline/blob/99ea7058c7694df1a63d48de21b5f57fc407c0e0/src/viewer.js#L11-21
 */
function getOfficeOnlineMimes(): string[] {
	return getCapabilities()?.officeonline?.mimetypes || []
}

export function getMimesForApp(appName: string): string[] {
	switch (appName) {
		case 'richdocuments':
			return getRichDocumentMimes()
		case 'onlyoffice':
			return getOnlyOfficeMimes()
		case 'officeonline':
			return getOfficeOnlineMimes()
		default:
			return []
	}
}
