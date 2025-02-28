import { SupportedChainId as ChainId } from './chains'
import { Token } from '../types'

export const XDAI_SYMBOL = 'XDAI'

export const WRAPPED_NATIVE_TOKEN: Record<ChainId, Token> = {
  [ChainId.MAINNET]: new Token('WETH', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
  [ChainId.GOERLI]: new Token('WETH', '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6'),
  [ChainId.BSC_TEST]: new Token('WBNB', '0xae13d989dac2f0debff460ac112a837c89baa7cd'),
  [ChainId.GNOSIS_CHAIN]: new Token('WXDAI', '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d'),
}

export const NATIVE: Record<ChainId, string> = {
  [ChainId.MAINNET]: 'ETH',
  [ChainId.GOERLI]: 'ETH',
  [ChainId.BSC_TEST]: 'tBNB',
  [ChainId.GNOSIS_CHAIN]: XDAI_SYMBOL,
}
