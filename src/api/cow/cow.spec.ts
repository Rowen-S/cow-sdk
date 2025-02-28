import { ethers } from 'ethers'
import fetchMock, { enableFetchMocks } from 'jest-fetch-mock'
import { CowSdk } from '../../CowSdk'
import { BUY_ETH_ADDRESS, OrderKind, SigningScheme } from '@cowprotocol/contracts'
import { FeeQuoteParams, PriceQuoteLegacyParams } from './types'
import QuoteError from './errors/QuoteError'
import { CowError } from '../../utils/common'
import { OrderCancellation, OrderCreation, UnsignedOrder } from '../../utils/sign'
import { ZERO_ADDRESS } from '../../constants'
import { SupportedChainId } from '../../constants/chains'

enableFetchMocks()

const chainId = 100 as SupportedChainId // Gnosis chain

const signer = ethers.Wallet.createRandom()

const cowSdk = new CowSdk(chainId, { signer })

const HTTP_STATUS_OK = 200
const HTTP_STATUS_NOT_FOUND = 404
const HTTP_BAD_REQUEST = 400
const HEADERS = { 'Content-Type': 'application/json' }

const SIGNED_ORDER_RESPONSE = {
  signature:
    '0x4d306ce7c770d22005bcfc00223f8d9aaa04e8a20099cc986cb9ccf60c7e876b777ceafb1e03f359ebc6d3dc84245d111a3df584212b5679cb5f9e6717b69b031b',
  signingScheme: SigningScheme.EIP712,
}

const PARTIAL_ORDER = {
  sellToken: '0x6810e776880c02933d47db1b9fc05908e5386b96',
  buyToken: '0x6810e776880c02933d47db1b9fc05908e5386b96',
  receiver: '0x6810e776880c02933d47db1b9fc05908e5386b96',
  sellAmount: '1234567890',
  buyAmount: '1234567890',
  validTo: 0,
  appData: '0x0000000000000000000000000000000000000000000000000000000000000000',
  partiallyFillable: true,
  sellTokenBalance: 'erc20',
  buyTokenBalance: 'erc20',
  from: '0x6810e776880c02933d47db1b9fc05908e5386b96',
  kind: 'buy',
  class: 'market',
}

const ORDER_RESPONSE = {
  ...PARTIAL_ORDER,
  feeAmount: '1234567890',
  ...SIGNED_ORDER_RESPONSE,
  creationTime: '2020-12-03T18:35:18.814523Z',
  owner: '0x6810e776880c02933d47db1b9fc05908e5386b96',
  uid: '0x59920c85de0162e9e55df8d396e75f3b6b7c2dfdb535f03e5c807731c31585eaff714b8b0e2700303ec912bd40496c3997ceea2b616d6710',
  availableBalance: '1234567890',
  executedSellAmount: '1234567890',
  executedSellAmountBeforeFees: '1234567890',
  executedBuyAmount: '1234567890',
  executedFeeAmount: '1234567890',
  invalidated: true,
  status: 'presignaturePending',
  fullFeeAmount: '1234567890',
}

const ETH_FLOW_ORDER_RESPONSE = {
  ...ORDER_RESPONSE,
  owner: '0x76aaf674848311c7f21fc691b0b952f016da49f3', // EthFlowContract
  ethflowData: {
    isRefunded: false,
    validTo: Date.now() + 60 * 1000 * 5,
  },
  onchainUser: '0x6810e776880c02933d47db1b9fc05908e5386b96',
}

const ORDER_CANCELLATION = {
  chainId,
  cancellation: {
    orderUid:
      '0x59920c85de0162e9e55df8d396e75f3b6b7c2dfdb535f03e5c807731c31585eaff714b8b0e2700303ec912bd40496c3997ceea2b616d6710',
    ...SIGNED_ORDER_RESPONSE,
  } as unknown as OrderCancellation,
  owner: '0x6810e776880c02933d47db1b9fc05908e5386b96',
}

const TRADE_RESPONSE = {
  blockNumber: 0,
  logIndex: 0,
  orderUid: 'string',
  owner: '0x6810e776880c02933d47db1b9fc05908e5386b96',
  sellToken: '0x6810e776880c02933d47db1b9fc05908e5386b96',
  buyToken: '0x6810e776880c02933d47db1b9fc05908e5386b96',
  sellAmount: '1234567890',
  sellAmountBeforeFees: '1234567890',
  buyAmount: '1234567890',
  transactionHash: '0xd51f28edffcaaa76be4a22f6375ad289272c037f3cc072345676e88d92ced8b5',
}

const FETCH_RESPONSE_PARAMETERS = {
  body: undefined,
  headers: {
    'Content-Type': 'application/json',
  },
  method: 'GET',
}

const PRICE_QUOTE_RESPONSE = {
  amount: '1234567890',
  token: '0x6810e776880c02933d47db1b9fc05908e5386b96',
}

const QUOTE_REQUEST = {
  ...PARTIAL_ORDER,
  priceQuality: 'fast',
  sellAmountBeforeFee: '1234567890',
  amount: '1234567890',
  userAddress: '0x6810e776880c02933d47db1b9fc05908e5386b96',
}
const QUOTE_RESPONSE = {
  quote: {
    kind: 'buy',
    sellToken: '0x6810e776880c02933d47db1b9fc05908e5386b96',
    buyToken: '0x6810e776880c02933d47db1b9fc05908e5386b96',
    receiver: '0x6810e776880c02933d47db1b9fc05908e5386b96',
    sellAmount: '1234567890',
    buyAmount: '1234567890',
    validTo: 0,
    appData: '0x0000000000000000000000000000000000000000000000000000000000000000',
    feeAmount: '1234567890',
    partiallyFillable: false,
    sellTokenBalance: 'erc20',
    buyTokenBalance: 'erc20',
  },
  from: '0x6810e776880c02933d47db1b9fc05908e5386b96',
  expirationDate: '1985-03-10T18:35:18.814523Z',
}

const PROFILE_DATA_RESPONSE = {
  totalTrades: 1,
  totalReferrals: 0,
  tradeVolumeUsd: 24.22795306584268,
  referralVolumeUsd: 0.0,
  lastUpdated: '2022-04-11T15:51:06Z',
}

beforeEach(() => {
  fetchMock.resetMocks()
})

afterEach(() => {
  jest.restoreAllMocks()
})

test('Valid: Get orders link', async () => {
  const orderLink = await cowSdk.cowApi.getOrderLink(ORDER_RESPONSE.uid)
  expect(orderLink).toEqual(`https://api.cow.fi/xdai/api/v1/orders/${ORDER_RESPONSE.uid}`)
})

test('Valid: Get an order', async () => {
  // given
  fetchMock.mockResponseOnce(JSON.stringify(ORDER_RESPONSE), {
    status: HTTP_STATUS_OK,
    headers: HEADERS,
  })

  // when
  const order = await cowSdk.cowApi.getOrder(ORDER_RESPONSE.uid)

  // then
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    `https://api.cow.fi/xdai/api/v1/orders/${ORDER_RESPONSE.uid}`,
    FETCH_RESPONSE_PARAMETERS
  )
  expect(order?.uid).toEqual(ORDER_RESPONSE.uid)
})

test('Valid: Get an order from barn without env set', async () => {
  // given
  fetchMock.mockRejectOnce(Error('something went wrong'))
  fetchMock.mockResponseOnce(JSON.stringify(ORDER_RESPONSE), {
    status: HTTP_STATUS_OK,
    headers: HEADERS,
  })

  // when
  const order = await cowSdk.cowApi.getOrder(ORDER_RESPONSE.uid)

  // then
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock).toHaveBeenCalledWith(
    `https://api.cow.fi/xdai/api/v1/orders/${ORDER_RESPONSE.uid}`,
    FETCH_RESPONSE_PARAMETERS
  )
  expect(fetchMock).toHaveBeenCalledWith(
    `https://barn.api.cow.fi/xdai/api/v1/orders/${ORDER_RESPONSE.uid}`,
    FETCH_RESPONSE_PARAMETERS
  )
  expect(order?.uid).toEqual(ORDER_RESPONSE.uid)
})

test('Invalid: Get an order', async () => {
  // given
  fetchMock.mockResponse(
    JSON.stringify({
      errorType: 'NotFound',
      description: "You've passed an invalid URL",
    }),
    { status: HTTP_STATUS_NOT_FOUND, headers: HEADERS }
  )

  // when
  const promise = cowSdk.cowApi.getOrder('notValidOrderId', { env: undefined })

  // then
  await expect(promise).rejects.toThrow('Not found')
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.cow.fi/xdai/api/v1/orders/notValidOrderId',
    FETCH_RESPONSE_PARAMETERS
  )
  expect(fetchMock).toHaveBeenCalledWith(
    'https://barn.api.cow.fi/xdai/api/v1/orders/notValidOrderId',
    FETCH_RESPONSE_PARAMETERS
  )
})

test('Invalid: Get an order failed on both envs', async () => {
  // given
  fetchMock.mockReject(Error('something went wrong'))

  // when
  const promise = cowSdk.cowApi.getOrder(ORDER_RESPONSE.uid)

  // then
  await expect(promise).rejects.toThrow(
    'Order fetch failed. This may be due to a server or network connectivity issue. Please try again later.'
  )
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock).toHaveBeenCalledWith(
    `https://api.cow.fi/xdai/api/v1/orders/${ORDER_RESPONSE.uid}`,
    FETCH_RESPONSE_PARAMETERS
  )
  expect(fetchMock).toHaveBeenCalledWith(
    `https://barn.api.cow.fi/xdai/api/v1/orders/${ORDER_RESPONSE.uid}`,
    FETCH_RESPONSE_PARAMETERS
  )
})

test('Valid: Get last 5 orders for a given trader ', async () => {
  const ORDERS_RESPONSE = Array(5).fill(ORDER_RESPONSE)
  fetchMock.mockResponse(JSON.stringify(ORDERS_RESPONSE), { status: HTTP_STATUS_OK, headers: HEADERS })
  const orders = await cowSdk.cowApi.getOrders({
    owner: '0x00000000005ef87f8ca7014309ece7260bbcdaeb', // Trader
    limit: 5,
    offset: 0,
  })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.cow.fi/xdai/api/v1/account/0x00000000005ef87f8ca7014309ece7260bbcdaeb/orders/?limit=5',
    FETCH_RESPONSE_PARAMETERS
  )
  expect(orders.length).toEqual(5)
})

test('Invalid: Get last 5 orders for an unexisting trader ', async () => {
  // given
  fetchMock.mockResponse(
    JSON.stringify({
      errorType: 'NotFound',
      description: "You've passed an invalid URL",
    }),
    { status: HTTP_STATUS_NOT_FOUND, headers: HEADERS }
  )

  // when
  const promise = cowSdk.cowApi.getOrders({
    owner: 'invalidOwner',
    limit: 5,
    offset: 0,
  })

  // then
  await expect(promise).rejects.toThrow('Not found')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.cow.fi/xdai/api/v1/account/invalidOwner/orders/?limit=5',
    FETCH_RESPONSE_PARAMETERS
  )
})

test('Valid: Get tx orders from a given txHash', async () => {
  const ORDERS_RESPONSE = Array(5).fill(ORDER_RESPONSE)
  const txHash = '0xd51f28edffcaaa76be4a22f6375ad289272c037f3cc072345676e88d92ced8b5'
  fetchMock.mockResponse(JSON.stringify(ORDERS_RESPONSE), { status: HTTP_STATUS_OK, headers: HEADERS })
  const txOrders = await cowSdk.cowApi.getTxOrders(txHash)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    `https://api.cow.fi/xdai/api/v1/transactions/${txHash}/orders`,
    FETCH_RESPONSE_PARAMETERS
  )
  expect(txOrders.length).toEqual(5)
})

test('Invalid: Get tx orders from an unexisting txHash', async () => {
  // given
  fetchMock.mockResponse(
    JSON.stringify({
      errorType: 'NotFound',
      description: "You've passed an invalid URL",
    }),
    { status: HTTP_STATUS_NOT_FOUND, headers: HEADERS }
  )

  // when
  const promise = cowSdk.cowApi.getTxOrders('invalidTxHash')

  // then
  await expect(promise).rejects.toThrow('Not found')
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.cow.fi/xdai/api/v1/transactions/invalidTxHash/orders',
    FETCH_RESPONSE_PARAMETERS
  )
  expect(fetchMock).toHaveBeenCalledWith(
    'https://barn.api.cow.fi/xdai/api/v1/transactions/invalidTxHash/orders',
    FETCH_RESPONSE_PARAMETERS
  )
})

test('Valid: Get last 5 trades for a given trader ', async () => {
  const TRADES_RESPONSE = Array(5).fill(TRADE_RESPONSE)
  fetchMock.mockResponse(JSON.stringify(TRADES_RESPONSE), { status: HTTP_STATUS_OK, headers: HEADERS })
  const trades = await cowSdk.cowApi.getTrades({
    owner: TRADE_RESPONSE.owner, // Trader
  })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    `https://api.cow.fi/xdai/api/v1/trades?owner=${TRADE_RESPONSE.owner}`,
    FETCH_RESPONSE_PARAMETERS
  )
  expect(trades.length).toEqual(5)
})

test('Valid: Get last 5 trades for a given order id ', async () => {
  const TRADES_RESPONSE = Array(5).fill(TRADE_RESPONSE)
  fetchMock.mockResponse(JSON.stringify(TRADES_RESPONSE), { status: HTTP_STATUS_OK, headers: HEADERS })
  const trades = await cowSdk.cowApi.getTrades({
    orderId: TRADE_RESPONSE.orderUid,
  })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    `https://api.cow.fi/xdai/api/v1/trades?orderUid=${TRADE_RESPONSE.orderUid}`,
    FETCH_RESPONSE_PARAMETERS
  )
  expect(trades.length).toEqual(5)
})

test('Invalid: Get trades passing both the owner and orderId', async () => {
  await expect(
    // @ts-expect-error both owner and orderId can't be passed at the same time
    cowSdk.cowApi.getTrades({
      owner: TRADE_RESPONSE.owner,
      orderId: TRADE_RESPONSE.orderUid,
    })
  ).rejects.toThrowError(CowError)
})

test('Invalid: Get last 5 trades for an unexisting trader ', async () => {
  // given
  fetchMock.mockResponse(
    JSON.stringify({
      errorType: 'NotFound',
      description: "You've passed an invalid URL",
    }),
    { status: HTTP_STATUS_NOT_FOUND, headers: HEADERS }
  )

  // when
  const promise = cowSdk.cowApi.getTrades({
    owner: 'invalidOwner',
  })

  // then
  await expect(promise).rejects.toThrow('Not found')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.cow.fi/xdai/api/v1/trades?owner=invalidOwner',
    FETCH_RESPONSE_PARAMETERS
  )
})

test('Valid: Get Price Quote from partial order', async () => {
  fetchMock.mockResponse(JSON.stringify(QUOTE_RESPONSE), { status: HTTP_STATUS_OK, headers: HEADERS })
  const quote = await cowSdk.cowApi.getQuoteLegacyParams(QUOTE_REQUEST as FeeQuoteParams)
  const { kind, sellToken, buyToken, receiver, validTo, appData, partiallyFillable } = QUOTE_RESPONSE.quote
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith('https://api.cow.fi/xdai/api/v1/quote', {
    ...FETCH_RESPONSE_PARAMETERS,
    body: JSON.stringify({
      kind,
      buyAmountAfterFee: '1234567890',
      sellToken,
      buyToken,
      from: QUOTE_RESPONSE.from,
      receiver,
      appData,
      validTo,
      partiallyFillable,
    }),
    method: 'POST',
  })

  expect(quote?.from).toEqual(QUOTE_RESPONSE.from)
  expect(quote?.quote.buyToken).toEqual(QUOTE_RESPONSE.quote.buyToken)
  expect(quote?.quote.sellToken).toEqual(QUOTE_RESPONSE.quote.sellToken)
})

test('Valid: Get Price Quote (Legacy)', async () => {
  fetchMock.mockResponseOnce(JSON.stringify(PRICE_QUOTE_RESPONSE), { status: HTTP_STATUS_OK, headers: HEADERS })
  const price = await cowSdk.cowApi.getPriceQuoteLegacy({
    baseToken: '0x6810e776880c02933d47db1b9fc05908e5386b96',
    quoteToken: '0x6810e776880c02933d47db1b9fc05908e5386b96',
    amount: '1234567890',
    kind: OrderKind.BUY,
  } as PriceQuoteLegacyParams)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.cow.fi/xdai/api/v1/markets/0x6810e776880c02933d47db1b9fc05908e5386b96-0x6810e776880c02933d47db1b9fc05908e5386b96/buy/1234567890',
    FETCH_RESPONSE_PARAMETERS
  )
  expect(price?.amount).toEqual(PRICE_QUOTE_RESPONSE.amount)
  expect(price?.token).toEqual(PRICE_QUOTE_RESPONSE.token)
})

test('Invalid: Get Price Quote from unexisting partial order', async () => {
  // given
  fetchMock.mockResponse(
    JSON.stringify({
      errorType: 'NoLiquidity',
      description: 'string',
    }),
    { status: HTTP_BAD_REQUEST, headers: HEADERS }
  )

  // when
  const promise = cowSdk.cowApi.getQuoteLegacyParams({ ...QUOTE_REQUEST, from: ZERO_ADDRESS } as FeeQuoteParams)

  // then
  await expect(promise).rejects.toThrow('Token pair selected has insufficient liquidity')
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

test('Invalid: Get Price Quote (Legacy) with unexisting token', async () => {
  fetchMock.mockResponse(
    JSON.stringify({
      errorType: 'NotFound',
      description: "You've passed an invalid URL",
    }),
    { status: HTTP_STATUS_NOT_FOUND, headers: HEADERS }
  )
  try {
    await cowSdk.cowApi.getPriceQuoteLegacy({
      baseToken: 'unexistingToken',
      quoteToken: 'unexistingToken',
      amount: '1234567890',
      kind: OrderKind.BUY,
    } as PriceQuoteLegacyParams)
  } catch (e) {
    const error = e as QuoteError
    expect(error.message).toEqual('Token pair selected has insufficient liquidity')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.cow.fi/xdai/api/v1/markets/unexistingToken-unexistingToken/buy/1234567890',
      FETCH_RESPONSE_PARAMETERS
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'https://barn.api.cow.fi/xdai/api/v1/markets/unexistingToken-unexistingToken/buy/1234567890',
      FETCH_RESPONSE_PARAMETERS
    )
  }
})

test('Valid: Get Price Quote', async () => {
  fetchMock.mockResponseOnce(JSON.stringify(PRICE_QUOTE_RESPONSE), { status: HTTP_STATUS_OK, headers: HEADERS })
  const price = await cowSdk.cowApi.getPriceQuoteLegacy({
    baseToken: '0x6810e776880c02933d47db1b9fc05908e5386b96',
    quoteToken: '0x6810e776880c02933d47db1b9fc05908e5386b96',
    amount: '1234567890',
    kind: OrderKind.BUY,
  } as PriceQuoteLegacyParams)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.cow.fi/xdai/api/v1/markets/0x6810e776880c02933d47db1b9fc05908e5386b96-0x6810e776880c02933d47db1b9fc05908e5386b96/buy/1234567890',
    FETCH_RESPONSE_PARAMETERS
  )
  expect(price?.amount).toEqual(PRICE_QUOTE_RESPONSE.amount)
  expect(price?.token).toEqual(PRICE_QUOTE_RESPONSE.token)
})

test('Valid: Get Profile Data', async () => {
  fetchMock.mockResponseOnce(JSON.stringify(PROFILE_DATA_RESPONSE), { status: HTTP_STATUS_OK, headers: HEADERS })
  const cowSdk1 = new CowSdk(chainId)
  cowSdk1.updateChainId(1)

  await cowSdk1.cowApi.getProfileData('0x6810e776880c02933d47db1b9fc05908e5386b96')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.cow.fi/affiliate/api/v1/profile/0x6810e776880c02933d47db1b9fc05908e5386b96',
    FETCH_RESPONSE_PARAMETERS
  )
})

test('Invalid: Get Profile Data from unexisting address', async () => {
  // given
  fetchMock.mockResponse(
    JSON.stringify({
      errorType: 'NotFound',
      description: "You've passed an invalid URL",
    }),
    { status: HTTP_STATUS_NOT_FOUND, headers: HEADERS }
  )
  const cowSdk1 = new CowSdk(chainId)
  cowSdk1.updateChainId(1)

  // when
  const promise = cowSdk1.cowApi.getProfileData('unexistingAddress')

  // then
  await expect(promise).rejects.toThrow("You've passed an invalid URL")
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.cow.fi/affiliate/api/v1/profile/unexistingAddress',
    FETCH_RESPONSE_PARAMETERS
  )
  expect(fetchMock).toHaveBeenCalledWith(
    'https://barn.api.cow.fi/affiliate/api/v1/profile/unexistingAddress',
    FETCH_RESPONSE_PARAMETERS
  )
})

test('Invalid: Get Profile Data from not supported network', async () => {
  fetchMock.mockResponseOnce(JSON.stringify(PROFILE_DATA_RESPONSE), { status: HTTP_STATUS_OK, headers: HEADERS })
  const profileData = await cowSdk.cowApi.getProfileData('0x6810e776880c02933d47db1b9fc05908e5386b96') // This will call sdk on xdai which is not supported
  expect(profileData).toBeNull() // getProfileData will return null when network is different from Mainnet
})

test('Valid: Sign Order', async () => {
  const order: Omit<UnsignedOrder, 'appData'> = {
    kind: OrderKind.SELL,
    partiallyFillable: false, // Allow partial executions of an order (true would be for a "Fill or Kill" order, which is not yet supported but will be added soon)
    sellToken: '0xc778417e063141139fce010982780140aa0cd5ab', // WETH
    buyToken: '0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b', // USDC
    sellAmount: '1234567890',
    buyAmount: '1234567890',
    validTo: 2524608000,
    receiver: '0x6810e776880c02933d47db1b9fc05908e5386b96',
    feeAmount: '1234567890',
  }

  const signedOrder = await cowSdk.signOrder(order)
  expect(signedOrder.signature).not.toBeNull()
  expect(signedOrder.signingScheme).not.toBeNull()
})

test('Valid: Send sign order cancellation', async () => {
  fetchMock.mockResponseOnce(JSON.stringify(SIGNED_ORDER_RESPONSE), { status: HTTP_STATUS_OK, headers: HEADERS })
  await cowSdk.cowApi.sendSignedOrderCancellation(ORDER_CANCELLATION)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    `https://api.cow.fi/xdai/api/v1/orders/${ORDER_CANCELLATION.cancellation.orderUid}`,
    {
      ...FETCH_RESPONSE_PARAMETERS,
      body: JSON.stringify({ ...SIGNED_ORDER_RESPONSE, signingScheme: 'eip712', from: ORDER_CANCELLATION.owner }),
      method: 'DELETE',
    }
  )
})

test('Invalid: Send sign not found order cancellation', async () => {
  // given
  fetchMock.mockResponse(
    JSON.stringify({
      errorType: 'NotFound',
      description: "You've passed an invalid URL",
    }),
    { status: HTTP_STATUS_NOT_FOUND, headers: HEADERS }
  )

  // when
  const promise = cowSdk.cowApi.sendSignedOrderCancellation({
    ...ORDER_CANCELLATION,
    cancellation: { ...ORDER_CANCELLATION.cancellation, orderUid: 'unexistingOrder' },
  })

  // then
  await expect(promise).rejects.toThrow('Not found')
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock).toHaveBeenCalledWith('https://api.cow.fi/xdai/api/v1/orders/unexistingOrder', {
    ...FETCH_RESPONSE_PARAMETERS,
    body: JSON.stringify({ ...SIGNED_ORDER_RESPONSE, signingScheme: 'eip712', from: ORDER_CANCELLATION.owner }),
    method: 'DELETE',
  })
})

test('Valid: Sign cancellation Order', async () => {
  const signCancellationOrder = await cowSdk.signOrderCancellation(ORDER_RESPONSE.uid)
  expect(signCancellationOrder.signature).not.toBeNull()
  expect(signCancellationOrder.signingScheme).not.toBeNull()
})

test('Valid: Send an order ', async () => {
  fetchMock.mockResponseOnce(JSON.stringify('validOrderId'), { status: HTTP_STATUS_OK, headers: HEADERS })
  const orderId = await cowSdk.cowApi.sendOrder({
    order: { ...ORDER_RESPONSE, ...SIGNED_ORDER_RESPONSE } as Omit<OrderCreation, 'appData'>,
    owner: '0x1811be0994930fe9480eaede25165608b093ad7a',
  })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith('https://api.cow.fi/xdai/api/v1/orders', {
    ...FETCH_RESPONSE_PARAMETERS,
    body: JSON.stringify({
      ...ORDER_RESPONSE,
      ...SIGNED_ORDER_RESPONSE,
      from: '0x1811be0994930fe9480eaede25165608b093ad7a',
      signingScheme: 'eip712',
    }),
    method: 'POST',
  })
  expect(orderId).toEqual('validOrderId')
})

test('Invalid: Send an duplicate order ', async () => {
  // given
  fetchMock.mockResponse(
    JSON.stringify({
      errorType: 'DuplicateOrder',
      description: 'string',
    }),
    { status: HTTP_STATUS_NOT_FOUND, headers: HEADERS }
  )

  // when
  const promise = cowSdk.cowApi.sendOrder({
    order: { ...ORDER_RESPONSE, ...SIGNED_ORDER_RESPONSE } as Omit<OrderCreation, 'appData'>,
    owner: '0x1811be0994930fe9480eaede25165608b093ad7a',
  })

  // then
  await expect(promise).rejects.toThrow('There was another identical order already submitted. Please try again.')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith('https://api.cow.fi/xdai/api/v1/orders', {
    ...FETCH_RESPONSE_PARAMETERS,
    body: JSON.stringify({
      ...ORDER_RESPONSE,
      ...SIGNED_ORDER_RESPONSE,
      from: '0x1811be0994930fe9480eaede25165608b093ad7a',
      signingScheme: 'eip712',
    }),
    method: 'POST',
  })
})

test('Valid: Instantiate SDK without chainId defaults to mainnet', async () => {
  const cowSdk1 = new CowSdk()
  const chainId = await cowSdk1.context.chainId
  expect(chainId).toEqual(SupportedChainId.MAINNET)
})

test('Valid: Get last 5 orders changing options parameters', async () => {
  const ORDERS_RESPONSE = Array(5).fill(ORDER_RESPONSE)
  fetchMock.mockResponseOnce(JSON.stringify(ORDERS_RESPONSE), { status: HTTP_STATUS_OK, headers: HEADERS })
  const orders = await cowSdk.cowApi.getOrders(
    {
      owner: '0x00000000005ef87f8ca7014309ece7260bbcdaeb', // Trader
      limit: 5,
      offset: 0,
    },
    { env: 'staging', chainId: SupportedChainId.MAINNET }
  )
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    'https://barn.api.cow.fi/mainnet/api/v1/account/0x00000000005ef87f8ca7014309ece7260bbcdaeb/orders/?limit=5',
    FETCH_RESPONSE_PARAMETERS
  )
  expect(orders.length).toEqual(5)
})

test('Valid: Get last 5 trades changing options parameters', async () => {
  const TRADES_RESPONSE = Array(5).fill(TRADE_RESPONSE)
  fetchMock.mockResponseOnce(JSON.stringify(TRADES_RESPONSE), { status: HTTP_STATUS_OK, headers: HEADERS })
  const trades = await cowSdk.cowApi.getTrades(
    {
      owner: TRADE_RESPONSE.owner, // Trader
    },
    { env: 'staging', chainId: SupportedChainId.MAINNET }
  )
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    `https://barn.api.cow.fi/mainnet/api/v1/trades?owner=${TRADE_RESPONSE.owner}`,
    FETCH_RESPONSE_PARAMETERS
  )
  expect(trades.length).toEqual(5)
})

test('Valid: Update sdk context', async () => {
  await cowSdk.updateContext({ env: 'prod' })
  expect(cowSdk.context.env).toEqual('prod')
})

describe('Transform EthFlow orders', () => {
  test('getOrder', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(ETH_FLOW_ORDER_RESPONSE), {
      status: HTTP_STATUS_OK,
      headers: HEADERS,
    })

    // when
    const order = await cowSdk.cowApi.getOrder(ETH_FLOW_ORDER_RESPONSE.uid)

    // then
    expect(order?.owner).toEqual(order?.onchainUser)
    expect(order?.validTo).toEqual(order?.ethflowData?.userValidTo)
    expect(order?.sellToken).toEqual(BUY_ETH_ADDRESS)
  })

  test('getOrders', async () => {
    // given
    const ORDERS_RESPONSE = [ETH_FLOW_ORDER_RESPONSE, ORDER_RESPONSE]
    fetchMock.mockResponse(JSON.stringify(ORDERS_RESPONSE), { status: HTTP_STATUS_OK, headers: HEADERS })

    // when
    const orders = await cowSdk.cowApi.getOrders({
      owner: '0x6810e776880c02933d47db1b9fc05908e5386b96', // Trader
      limit: 5,
      offset: 0,
    })

    // then
    // eth flow order
    expect(orders[0].owner).toEqual(orders[0].onchainUser)
    expect(orders[0].validTo).toEqual(orders[0].ethflowData?.userValidTo)
    expect(orders[0].sellToken).toEqual(BUY_ETH_ADDRESS)
    // regular order
    expect(orders[1].owner).toEqual(ORDER_RESPONSE.owner)
    expect(orders[1].validTo).toEqual(ORDER_RESPONSE.validTo)
    expect(orders[1].sellToken).toEqual(ORDER_RESPONSE.sellToken)
  })

  test('getTxOrders', async () => {
    // given
    const ORDERS_RESPONSE = [ETH_FLOW_ORDER_RESPONSE, ORDER_RESPONSE]
    const txHash = '0xd51f28edffcaaa76be4a22f6375ad289272c037f3cc072345676e88d92ced8b5'
    fetchMock.mockResponse(JSON.stringify(ORDERS_RESPONSE), { status: HTTP_STATUS_OK, headers: HEADERS })

    // when
    const txOrders = await cowSdk.cowApi.getTxOrders(txHash)

    // then
    // eth flow order
    expect(txOrders[0].owner).toEqual(txOrders[0].onchainUser)
    expect(txOrders[0].validTo).toEqual(txOrders[0].ethflowData?.userValidTo)
    expect(txOrders[0].sellToken).toEqual(BUY_ETH_ADDRESS)
    // regular order
    expect(txOrders[1].owner).toEqual(ORDER_RESPONSE.owner)
    expect(txOrders[1].validTo).toEqual(ORDER_RESPONSE.validTo)
    expect(txOrders[1].sellToken).toEqual(ORDER_RESPONSE.sellToken)
  })
})

test('API getOrder() method should return order with "class" property', async () => {
  // given
  fetchMock.mockResponseOnce(JSON.stringify({ ...ORDER_RESPONSE, class: 'limit' }), {
    status: HTTP_STATUS_OK,
    headers: HEADERS,
  })

  // when
  const order = await cowSdk.cowApi.getOrder(ORDER_RESPONSE.uid)

  // then
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    `https://api.cow.fi/xdai/api/v1/orders/${ORDER_RESPONSE.uid}`,
    FETCH_RESPONSE_PARAMETERS
  )
  expect(order?.class).toEqual('limit')
})
