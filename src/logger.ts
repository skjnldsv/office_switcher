// SPDX-FileCopyrightText: 2025 John Molakvoæ <skjnldsv@protonmail.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { getLoggerBuilder } from '@nextcloud/logger'

export const logger = getLoggerBuilder()
	.setApp('office_switcher')
	.detectUser()
	.build()
