import { getAssetPrice, getAssetSignal, getLatestPriceBoard, getLatestSignalSnapshot, TARGET_ASSETS, type TargetAsset } from '@nerdieblaq/shared-readonly';
import { formatPriceProviderOutput } from './formatters';
import { buildUnavailableProviderPayload } from './providerUtils';

const PRICE_DEBUG_PREFIX = '[blaq-price-debug]';

function extractRequestedAsset(userText: string): TargetAsset | null {
  const upper = userText.toUpperCase();
  return TARGET_ASSETS.find((asset) => upper.includes(asset)) ?? null;
}

export const priceProvider = {
  name: 'BLAQ_PRICE_CONTEXT',
  description:
    'Context-only provider for read-only token prices and board market data sourced from gdex.skill-backed signal data. Never use this as an action.',
  dynamic: true,
  get: async (_runtime: unknown, message?: { content?: { text?: string } }) => {
    const userText = message?.content?.text ?? '';
    const requestedAsset = extractRequestedAsset(userText);

    console.log(
      `${PRICE_DEBUG_PREFIX} provider_matched=true requested_asset=${requestedAsset ?? 'none'} question="${userText}"`
    );

    try {
      const [signalSnapshot, board, assetSnapshot, assetSignal] = await Promise.all([
        getLatestSignalSnapshot(),
        getLatestPriceBoard(),
        requestedAsset ? getAssetPrice(requestedAsset) : Promise.resolve(null),
        requestedAsset ? getAssetSignal(requestedAsset) : Promise.resolve(null),
      ]);

      console.log(
        `${PRICE_DEBUG_PREFIX} board_found=${board.hasAnyData} board_stale=${board.stale} board_freshness=${board.freshness} signal_snapshot_found=${signalSnapshot.hasAnyData}`
      );

      if (requestedAsset) {
        console.log(
          `${PRICE_DEBUG_PREFIX} asset_found=${Boolean(assetSnapshot)} asset_stale=${assetSnapshot?.stale ?? true} asset_price=${assetSnapshot?.price ?? 'n/a'} asset_signal=${assetSignal?.latestSignal ?? 'n/a'}`
        );
      }

      if (!board.hasAnyData) {
        return buildUnavailableProviderPayload(
          'Price',
          'no board price or signal data is available yet.'
        );
      }

      return formatPriceProviderOutput(board, userText, assetSnapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Price unavailable.';
      console.log(`${PRICE_DEBUG_PREFIX} provider_error="${message}"`);
      return buildUnavailableProviderPayload('Price', message);
    }
  },
};
