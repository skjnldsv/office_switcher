// SPDX-FileCopyrightText: 2025 John Molakvoæ <skjnldsv@protonmail.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Node, View } from '@nextcloud/files'

import { emit } from '@nextcloud/event-bus'
import { FileAction, getFileActions } from '@nextcloud/files'
import { generateFilePath } from '@nextcloud/router'
import { getCapabilities } from '@nextcloud/capabilities'
import { loadState } from '@nextcloud/initial-state'

export function getAppIconSvgString(appName: string): string {
	const appIconUrl = generateFilePath(appName, '', 'img/app.svg')
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><image href="${appIconUrl}" width="24" height="24"/></svg>`
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
export async function execViewerAction(node: Node, view: View, dir: string, handler: string): Promise<boolean|null> {
	const onClose = () => {
		// This can sometime be called with the openfile set to true already. But we don't want to keep openfile when closing the viewer.
		const newQuery = { ...window.OCP.Files.Router.query }
		delete newQuery.openfile
		delete newQuery.editing
		window.OCP.Files.Router.goToRoute(null, window.OCP.Files.Router.params, newQuery)
	}

	window.addEventListener('popstate', onPopState)

	pushToHistory(node, view, dir)
	window.OCA.Viewer.openWith(handler, {
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
	const mimetypes = (getCapabilities()?.richdocuments?.mimetypes || []) as string[]
	const mimetypesNoDefaultOpen = (getCapabilities()?.richdocuments?.mimetypesNoDefaultOpen || []) as string[]
	return [... new Set([...mimetypes, ...mimetypesNoDefaultOpen])]
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
		case 'thinkfree':
			const formats = JSON.parse(loadState('office_switcher', 'thinkfree_supported_formats', '{}'))
			return Object.values(formats).map(type => Object.values(type.mime)).flat() as string[] || []
		default:
			return []
	}
}

export function getActionForApp(appName: string): FileAction | null {
	switch (appName) {
		case 'onlyoffice':
			return getFileActions().find(action => action.id === 'onlyoffice-open') || null
		case 'thinkfree':
			return getFileActions().find(action => action.id === 'thinkfreeEditorAction') || null
		default:
			return null;
	}
}
