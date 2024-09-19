<?php

namespace KingfisherDirect\BetterDebugHints\Plugin\View;

use Magento\Framework\View\Element\AbstractBlock;

class AliasHints
{
    public function aroundGetChildHtml(AbstractBlock $block, \Closure $proceed, string $alias = '', $useCache = true)
    {
        $html = $proceed($alias, $useCache);

        if (!$alias || !$html) {
            return $html;
        }

        $layout = $block->getLayout();
        $name = $block->getNameInLayout();
        $childName = $layout->getChildName($name, $alias);

        return
            "<script type='text/mage-debug' data-mage-debug-position='start' data-mage-debug='$childName'></script>".
            $html.
            "<script type='text/mage-debug' data-mage-debug-position='end' data-mage-debug='$childName'></script>";
    }
}
