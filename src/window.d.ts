/**
 * SPDX-FileCopyrightText: 2025 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/// <reference types="@nextcloud/typings" />

type SettingOptions = {
	el: () => HTMLElement
	open?: () => void
	close?: () => void
	order?: number
}

type ViewerOptions = {
	path: string
	fileInfo: any
	list?: any[]
	enableSidebar?: boolean
	loadMore?: () => any[]
	canLoop?: boolean
	onPrev?: () => void
	onNext?: () => void
	onClose?: () => void
}

declare global {
	interface Window {
		OC: Nextcloud.v29.OC

		// Private Files namespace
		OCA: {
			Files: {
				Settings: {
					register: (setting: { el: () => HTMLElement }) => void
					Setting: new (name, { el, open, close }: SettingOptions) => SettingOptions
				}
			}
		}

		// Public Files namespace
		OCP: {
			Viewer: {
				close: () => void
				open: (...options: ViewerOptions) => void
				openWith: (handlerId, options: ViewerOptions) => void
			}
		} & Nextcloud.v29.OCP
	}
}
