<?php

namespace KingfisherDirect\BetterDebugHints\Plugin\View;

use KingfisherDirect\BetterDebugHints\Helper\Config;
use Magento\Backend\Helper\Data;
use Magento\Cms\Block\Widget\Block as WidgetBlock;
use Magento\Framework\Interception\InterceptorInterface;
use Magento\Framework\View\Element\AbstractBlock;
use Magento\Framework\View\Layout;
use Magento\Framework\View\Layout\Element;

class LayoutHints
{
    private ?Layout $layout;
    private string $blockEditUrl;
    private bool $isEnabled;

    public function __construct(Layout $layout, Config $config, Data $helperBackend)
    {
        $this->blockEditUrl = $helperBackend->getUrl('cms/block/edit', ['block_id' => '__id__']);
        $this->isEnabled = $config->isHintEnabled();
        $this->layout = $this->isEnabled ? $layout : null;
    }

    public function aroundRenderElement(Layout $layout, \Closure $proceed, string $name, $useCache = true): string
    {
        $html = $proceed($name, $useCache);

        if (!$this->isEnabled || !$html || !trim($html)) {
            return $html;
        }

        if ($layout->getElementProperty($name, Element::CONTAINER_OPT_HTML_TAG)) {
            $label = "";

            if ($layout->getElementProperty($name, Element::CONTAINER_OPT_LABEL)) {
                $label = " data-mage-debug-label='$label'";
            }

            $html = preg_replace("@^(<[a-z0-9\-\_]+)[\s>]@i", "\${1} data-mage-debug='$name'$label ", $html);
        }

        if ($name === 'root') {
            $html = $this->getRootScript() . $html;
        }

        return
            "<script type='text/mage-debug' data-mage-debug-position='start' data-mage-debug='$name'></script>".
            $html.
            "<script type='text/mage-debug' data-mage-debug-position='end' data-mage-debug='$name'></script>";
    }

    private function getRootScript(): string
    {
        $structure = $this->getStructure();
        $structureJson = json_encode($structure);

        $blockEditUrl = $this->getBlockEditUrl();

        return <<<HTML
            <script>
                window.layoutStructure = {$structureJson};

                require(['KingfisherDirect_BetterDebugHints/js/LayoutHints'], function (LayoutHints) {
                    var layoutHints = new LayoutHints(window.layoutStructure, {
                        blockEditUrl: '{$blockEditUrl}',
                    });

                    if (!window.layout) {
                        window.layout = layoutHints.inspect.bind(layoutHints)
                    }

                    if (!window.lh) {
                        window.lh = layoutHints
                    }
                });
            </script>
        HTML;
    }

    private function getBlockEditUrl(): string
    {
        return $this->blockEditUrl;
    }

    private function getStructure($name = 'root'): array
    {
        $result = [];

        if ($name === 'root') {
            $result['handles'] = $this->layout->getUpdate()->getHandles();
        }

        if ($label = $this->layout->getElementProperty($name, Element::CONTAINER_OPT_LABEL)) {
            $result['label'] = $label;
        }

        $alias = $this->layout->getElementAlias($name);

        if ($alias && $alias !== $name) {
            $result['alias'] = $alias;
        }

        $childNames = $this->layout->getChildNames($name);

        if (count($childNames) > 0) {
            $result['children'] = [];
        }

        foreach ($childNames as $child) {
            $result['children'][$child] = $this->getStructure($child);
        }

        $block = $this->layout->getBlock($name);

        if ($block) {
            $result['block'] = $this->getBlockInfo($block);
        }

        if ($block instanceof WidgetBlock) {
            $result['blockId'] = $block->getBlockId();
        }

        return $result;
    }

    private function getBlockInfo(AbstractBlock $block)
    {
        return [
            'class' => $this->getBlockClass($block),
            'template' => $block->getTemplateFile(),
            'moduleName' => $block->getModuleName(),
            'nameInLayout' => $block->getNameInLayout(),
            'cacheKeyInfo' => @$block->getCacheKeyInfo(),
            'cacheLifetime' => $block->getCacheLifetime()
        ];
    }

    /**
     * Copyright (c) 2016, H&O E-commerce specialisten B.V.
     * All rights reserved.
     *
     * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
     * following conditions are met:
     *
     * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the
     *    following disclaimer.
     *
     * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the
     *    following disclaimer in the documentation and/or other materials provided with the distribution.
     *
     * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED
     * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
     * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
     * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
     * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
     * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
     * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
     */
    private function getBlockClass(AbstractBlock $block)
    {
        $className = get_class($block);

        if ($block instanceof InterceptorInterface) {
            $reflector = new \ReflectionClass($block); //@codingStandardsIgnoreLine
            $className = $reflector->getParentClass()->getName();
        }

        return $className;
    }
}
