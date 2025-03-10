const sdk = require("@defillama/sdk");
const {staking} = require("../helper/staking");
const {sumTokensAndLPsSharedOwners} = require("../helper/unwrapLPs");
const index = require('./index.json')
const MasterChefBeets = require('./MasterChefBeets.json')
const BalancerVaultBeets = require('./BalancerVaultBeets.json')
const BalancerWeightedPoolBeets = require('./BalancerWeightedPoolBeets.json')
const {default: BigNumber} = require("bignumber.js");

const fantomFhm = "0xfa1FBb8Ef55A4855E5688C0eE13aC3f202486286";
const fantomStaking = "0xcb9297425C889A7CbBaa5d3DB97bAb4Ea54829c2";
const fantomTreasuryContract = "0xA3b52d5A6d2f8932a5cD921e09DA840092349D71";
const moonriverFhm = "0xfa1FBb8Ef55A4855E5688C0eE13aC3f202486286";
const moonriverStaking = "0xF5C7D63C5Fc0aD4b7Cef7d8904239860725Ebc87";
const moonriverTreasuryContract = "0x5E983ff70DE345de15DbDCf0529640F14446cDfa";

// addreses of gnosis safe's according to: https://fantohm.com/#security
const fantomGnosisContract = "0x34F93b12cA2e13C6E64f45cFA36EABADD0bA30fC";
const moonriverGnosisContract = "0xE3CD5475f18a97D3563307B4e1A6467470237927";
const ethGnosisContract = "0x66a98CfCd5A0dCB4E578089E1D89134A3124F0b1";
const bscGnosisContract = "0x3538Acb37Cf5a92eBE7091714975b2f8dDd5c6C1";
const fantohmDaoDeployerWallet = "0x3381e86306145b062cEd14790b01AC5384D23D82";

//
// Moonriver TVL should consist of - treasury value and investments on gnosis safe
//
const movr_transforms = {
	"0x748134b5f553f2bcbd78c6826de99a70274bdeb3": "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
	"0xe936caa7f6d9f5c9e907111fcaf7c351c184cda7": "ethereum:0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
	"0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286": "fantom:0xfa1FBb8Ef55A4855E5688C0eE13aC3f202486286", // FHM
}

async function moonriverTvl(timestamp, block, chainBlocks) {
	let balances = {};

	// treasury value
	await sumTokensAndLPsSharedOwners(balances, [
				["0x748134b5f553f2bcbd78c6826de99a70274bdeb3", false], // USDC.m
				["0xE936CAA7f6d9F5C9e907111FCAf7c351c184CDA7", false], // USDT.m
				["0x0b6116bb2926d996cdeba9e1a79e44324b0401c9", true], // HB LP
			], [moonriverTreasuryContract], block, "moonriver",
			addr => (movr_transforms[addr.toLowerCase()] ? movr_transforms[addr.toLowerCase()] : `moonriver:${addr}`));

	// investments
	await Promise.all([
		addInvestment("moonriver", "0x98878B06940aE243284CA214f92Bb71a2b032B8A", moonriverGnosisContract, balances, chainBlocks.moonriver), // wMOVR
	]);

	return balances;
}

//
// Fantom TVL should consist of - treasury value and investments on gnosis safe
//
const fantom_transforms = {
	"0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e": "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI
}

async function fantomTvl(timestamp, block, chainBlocks) {
	let balances = {};

	// treasury value
	await sumTokensAndLPsSharedOwners(balances, [
				["0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e", false], // DAI
				["0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83", false], // wFTM
				["0x6fc9383486c163fa48becdec79d6058f984f62ca", false], // USDB
				["0xd77fc9c4074b56ecf80009744391942fbfddd88b", true],  // DAI/FHM
			], [fantomTreasuryContract], block, "fantom",
			addr => (fantom_transforms[addr.toLowerCase()] ? fantom_transforms[addr.toLowerCase()] : `fantom:${addr}`))

	// treasury values
	await Promise.all([
		balanceOfStablePool(fantomTreasuryContract, "0x7799f423534c319781b1b370B69Aaf2C75Ca16A3", "fantom:0x6fc9383486c163fa48becdec79d6058f984f62ca", "fantom:0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e", balances, block), // USDB-DAI stable pool
	]);

	// investments
	await Promise.all([
		balanceOf(fantomGnosisContract, "0x6fc9383486c163fa48becdec79d6058f984f62ca", "fantom:0x6fc9383486c163fa48becdec79d6058f984f62ca", balances, block), // USDB
		balanceOf(fantomGnosisContract, "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E", "0x6b175474e89094c44da98b954eedeac495271d0f", balances, block), // DAI
		beetsFtm_BeetsLp(fantohmDaoDeployerWallet, balances, block), // beets/wftm LP
		lqdrFtm_BeetsLp(fantohmDaoDeployerWallet, balances, block), // lqdr/wftm LP
	]);

	return balances;
}

//
// ETH TVL consists of investments on gnosis safe
//
async function ethTvl(timestamp, block, chainBlocks) {
	let balances = {};

	await Promise.all([
		addInvestment("ethereum", "0xd2877702675e6cEb975b4A1dFf9fb7BAF4C91ea9", ethGnosisContract, balances, chainBlocks.eth), // wLUNA
		addInvestment("ethereum", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", ethGnosisContract, balances, chainBlocks.eth), // wBTC
		addInvestment("ethereum", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", ethGnosisContract, balances, chainBlocks.eth), // wETH
		addInvestment("ethereum", "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0", ethGnosisContract, balances, chainBlocks.eth), // MATIC
		addInvestment("ethereum", "0x940a2db1b7008b6c776d4faaca729d6d4a4aa551", ethGnosisContract, balances, chainBlocks.eth), // DUSK
		addInvestment("ethereum", "0x4a220E6096B25EADb88358cb44068A3248254675", ethGnosisContract, balances, chainBlocks.eth), // QNT
		addInvestment("ethereum", "0xbA8A621b4a54e61C442F5Ec623687e2a942225ef", ethGnosisContract, balances, chainBlocks.eth), // QUARTZ

		xvader(fantohmDaoDeployerWallet, balances, chainBlocks.eth), // xVADER
		gohm(ethGnosisContract, balances, chainBlocks.eth), // gOHM
	])

	return balances;
}

//
// BOBA TVL consists of investment on FantOHM DAO Deployer wallat
//
async function bobaTvl(timestamp, block, chainBlocks) {
	let balances = {};

	// BOBA
	const balance = (await sdk.api.erc20.balanceOf({
		chain: "boba",
		block: chainBlocks.boba,
		target: "0xa18bf3994c0cc6e3b63ac420308e5383f53120d7",
		owner: fantohmDaoDeployerWallet,
	})).output;

	sdk.util.sumSingleBalance(balances, `ethereum:0x42bbfa2e77757c645eeaad1655e0911a7553efbc`, balance);

	return balances;
}

//
// BSC TVL consists of investment on gnosis safe
//
async function bscTvl(timestamp, block, chainBlocks) {
	let balances = {};

	// DOT
	let balance = (await sdk.api.erc20.balanceOf({
		chain: "bsc",
		block: chainBlocks.bsc,
		target: "0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402",
		owner: bscGnosisContract,
	})).output;

	sdk.util.sumSingleBalance(balances, `bsc:0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402`, balance);
	return balances;
}

async function xvader(owner, balances, block) {
	const xVaderCa = "0x665ff8fAA06986Bd6f1802fA6C1D2e7d780a7369"
	const vaderCa = "0x2602278EE1882889B946eb11DC0E810075650983"
	const vaderRate = 1.00707;

	let balance = await sdk.api.erc20.balanceOf({
		chain: "ethereum",
		block: block,
		target: xVaderCa,
		owner: owner,
	});

	sdk.util.sumSingleBalance(balances, vaderCa, balance.output * vaderRate);
}

async function addInvestment(chain, target, owner, balances, block) {
	const balance = (await sdk.api.erc20.balanceOf({
		chain: chain,
		block: block,
		target: target,
		owner: owner,
	})).output;

	sdk.util.sumSingleBalance(balances, chain + ":" + target, balance);
}

async function balanceOf(owner, ca, countAsCa, balances, block) {
	const balance = (await sdk.api.erc20.balanceOf({
		chain: "fantom",
		block: block,
		target: ca,
		owner: owner,
	})).output;

	sdk.util.sumSingleBalance(balances, countAsCa, balance);
}

async function balanceOfStablePool(owner, ca, countHalfAsCa1, countHalfAsCa2, balances, block) {
	const balance = (await sdk.api.erc20.balanceOf({
		chain: "fantom",
		block: block,
		target: ca,
		owner: owner,
	})).output;

	const half = BigNumber(Math.floor(balance / 2));

	sdk.util.sumSingleBalance(balances, countHalfAsCa1, half.toString(10));
	sdk.util.sumSingleBalance(balances, countHalfAsCa2, BigNumber(balance).minus(half.toString(10)).toString(10));
}

//
// valuation OHM governance token consist of amount of native (staked) token * staking index * market price
//
async function gohm(owner, balances, block) {
	const gohm = "0x0ab87046fBb341D058F17CBC4c1133F25a20a52f";
	const ohm = "0x64aa3364f17a4d01c6f1751fd97c2bd3d7e7f1d5";

	const gohmBalance = (await sdk.api.erc20.balanceOf({
		chain: "ethereum",
		block: block,
		target: gohm,
		owner: owner,
	})).output;

	const indexValue = (await sdk.api.abi.call({
		chain: "ethereum",
		block: block,
		target: gohm,
		abi: index.index
	})).output;

	sdk.util.sumSingleBalance(balances, ohm, BigNumber(gohmBalance).div(1e18) * indexValue);
}

async function beetsFtm_BeetsLp(owner, balances, block) {
	const beetsMasterChef = "0x8166994d9ebBe5829EC86Bd81258149B87faCfd3";
	const beetsVault = "0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce";
	const beetsBalancerWeightedPool = "0xcde5a11a4acb4ee4c805352cec57e236bdbc3837";
	const poolId = "0xcde5a11a4acb4ee4c805352cec57e236bdbc3837000200000000000000000019";

	const beets = "0xF24Bcf4d1e507740041C9cFd2DddB29585aDCe1e";
	const wftm = "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83";

	const fBeetsBalance = (await sdk.api.abi.call({
		chain: "fantom",
		block: block,
		target: beetsMasterChef,
		abi: MasterChefBeets.userInfo,
		params: [22, owner],
	})).output[0];

	const beetsPendingBalance = (await sdk.api.abi.call({
		chain: "fantom",
		block: block,
		target: beetsMasterChef,
		abi: MasterChefBeets.pendingBeets,
		params: [22, owner],
	})).output;

	const beetsBalance = (await sdk.api.erc20.balanceOf({
		chain: "fantom",
		block: block,
		target: beets,
		owner: owner,
	})).output;

	const totalSupply = (await sdk.api.abi.call({
		chain: "fantom",
		block: block,
		target: beetsBalancerWeightedPool,
		abi: BalancerWeightedPoolBeets.totalSupply,
	})).output;

	const poolTokens = (await sdk.api.abi.call({
		chain: "fantom",
		block: block,
		target: beetsVault,
		abi: BalancerVaultBeets.getPoolTokens,
		params: [poolId],
	})).output[1];

	const bptBalance = new BigNumber(fBeetsBalance * 1.0152).toString(10);
	const beetsFtmShare = bptBalance / totalSupply;

	sdk.util.sumSingleBalance(balances, "fantom:"+beets, new BigNumber(poolTokens[1] * beetsFtmShare).plus(beetsPendingBalance).plus(beetsBalance).toString(10));
	sdk.util.sumSingleBalance(balances, "fantom:"+wftm, new BigNumber(poolTokens[0] * beetsFtmShare).toString(10));
}

async function lqdrFtm_BeetsLp(owner, balances, block) {
	const beetsMasterChef = "0x8166994d9ebBe5829EC86Bd81258149B87faCfd3";
	const beetsVault = "0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce";
	const beetsBalancerWeightedPool = "0x5E02aB5699549675A6d3BEEb92A62782712D0509";
	const poolId = "0x5e02ab5699549675a6d3beeb92a62782712d0509000200000000000000000138";

	const lqdr = "0x10b620b2dbAC4Faa7D7FFD71Da486f5D44cd86f9";
	const beets = "0xF24Bcf4d1e507740041C9cFd2DddB29585aDCe1e";
	const wftm = "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83";

	const lqdrFtmBalance = (await sdk.api.abi.call({
		chain: "fantom",
		block: block,
		target: beetsMasterChef,
		abi: MasterChefBeets.userInfo,
		params: [36, owner],
	})).output[0];

	const beetsPendingBalance = (await sdk.api.abi.call({
		chain: "fantom",
		block: block,
		target: beetsMasterChef,
		abi: MasterChefBeets.pendingBeets,
		params: [36, owner],
	})).output;

	const totalSupply = (await sdk.api.abi.call({
		chain: "fantom",
		block: block,
		target: beetsBalancerWeightedPool,
		abi: BalancerWeightedPoolBeets.totalSupply,
	})).output;

	const poolTokens = (await sdk.api.abi.call({
		chain: "fantom",
		block: block,
		target: beetsVault,
		abi: BalancerVaultBeets.getPoolTokens,
		params: [poolId],
	})).output[1];

	const lqdrFtmShare = lqdrFtmBalance / totalSupply;

	sdk.util.sumSingleBalance(balances, "fantom:"+lqdr, new BigNumber(poolTokens[0] * lqdrFtmShare).toString(10));
	sdk.util.sumSingleBalance(balances, "fantom:"+wftm, new BigNumber(poolTokens[1] * lqdrFtmShare).toString(10));
	sdk.util.sumSingleBalance(balances, "fantom:"+beets, beetsPendingBalance);
}

module.exports = {
	fantom: {
		tvl: fantomTvl,
		staking: staking(fantomStaking, fantomFhm, "fantom")
	},
	moonriver: {
		tvl: moonriverTvl,
		staking: staking(moonriverStaking, moonriverFhm, "moonriver", "fantom:0xfa1FBb8Ef55A4855E5688C0eE13aC3f202486286")
	},
	ethereum: {
		tvl: ethTvl
	},
	bsc: {
		tvl: bscTvl
	},
	boba: {
		tvl: bobaTvl
	},
}
