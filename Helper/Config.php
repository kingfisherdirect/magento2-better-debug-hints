<?php
/**
 * Copyright (c) 2016, H&O E-commerce specialisten B.V.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
 * following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following
 *    disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the
 *    following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

namespace KingfisherDirect\BetterDebugHints\Helper;

use Magento\Developer\Helper\Data as DeveloperHelper;
use Magento\Framework\App\Helper\AbstractHelper;
use Magento\Framework\App\Helper\Context;
use Magento\Framework\App\State as AppState;
use Magento\Store\Model\StoreManagerInterface;

class Config extends AbstractHelper
{
    /** @var AppState $appState */
    private $appState;

    /** @var StoreManagerInterface $storeManager */
    private $storeManager;

    /** @var DeveloperHelper $developerHelper */
    private $developerHelper;

    /**
     * @param Context               $context
     * @param AppState              $appState
     * @param StoreManagerInterface $storeManager
     * @param DeveloperHelper       $developerHelper
     */
    public function __construct(
        Context $context,
        AppState $appState,
        StoreManagerInterface $storeManager,
        DeveloperHelper $developerHelper
    ) {
        parent::__construct($context);

        $this->appState = $appState;
        $this->storeManager = $storeManager;
        $this->developerHelper = $developerHelper;
    }

    /**
     * Check if the hints can be displayed.
     *
     * It will check if the url parameter is present.
     * For production mode it will also check if the IP-address is in Developer Client Restrictions.
     *
     * @return bool
     */
    public function isHintEnabled()
    {
        $isParamPresent = $this->_request->getParam('ath', false) === '1';

        if ($isParamPresent) {
            $applicationMode = $this->appState->getMode();
            $storeId = $this->storeManager->getStore()->getId();

            if ($applicationMode !== AppState::MODE_PRODUCTION || $this->developerHelper->isDevAllowed($storeId)) {
                return true;
            }
        }

        return false;
    }
}
