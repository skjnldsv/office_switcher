<?php
declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2025 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\OfficeSwitcher\Listeners;

use OCA\Files\Event\LoadAdditionalScriptsEvent;
use OCA\OfficeSwitcher\AppInfo\Application;
use OCP\App\IAppManager;
use OCP\AppFramework\Services\IInitialState;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\IL10N;
use OCP\IUserSession;
use OCP\Util;

/** @template-implements IEventListener<Event|LoadAdditionalScriptsEvent> */
class LoadAdditionalScriptsListener implements IEventListener {
	private ?string $thinkfreeSupportedFormatsJSON = null;

	// Office apps to process
	const APPS = ['richdocuments', 'onlyoffice', 'officeonline', 'thinkfree'];

	function __construct(
		private IAppManager $appManager,
		private IInitialState $initialState,
		private IL10N $l10n,
	) {}

	public function handle(Event $event): void {
		if (!($event instanceof LoadAdditionalScriptsEvent)) {
			return;
		}

		if ($this->thinkfreeSupportedFormatsJSON !== null) {
			$this->initialState->provideInitialState('thinkfree_supported_formats', $this->thinkfreeSupportedFormatsJSON);
		}

		// Check if thinkfree app is enabled and get the supported formats
		$thinkfreeSupportedFormats = 'assets/doc_formats/supported_formats.json';
		if ($this->appManager->isEnabledForUser('thinkfree')) {
			$appPath = $this->appManager->getAppPath('thinkfree');
			$thinkfreeSupportedFormats = $appPath . '/' . $thinkfreeSupportedFormats;
			$this->thinkfreeSupportedFormatsJSON = file_get_contents($thinkfreeSupportedFormats);
		}
	
		// Provide the initial state with the supported formats JSON
		if ($this->thinkfreeSupportedFormatsJSON !== null) {
			$this->initialState->provideInitialState('thinkfree_supported_formats', $this->thinkfreeSupportedFormatsJSON);
		}

		// Provide the translated app names to the frontend
		$apps = [];
		foreach(self::APPS as $appName) {
			$lang = $this->l10n->getLanguageCode();
			$app = $this->appManager->getAppInfo($appName, false, $lang);
			$apps[$appName] = $app['name'] ?? $appName;
		}
		$this->initialState->provideInitialState('office_apps', $apps);

		// Add scripts to the page
		Util::addScript(Application::APP_ID, Application::APP_ID . '-main', 'core', true);
	}
}
