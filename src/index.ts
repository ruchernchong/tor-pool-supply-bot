import axios from "axios";
import { Client, Intents } from "discord.js";
import { ethers } from "ethers";

import "dotenv/config";

export interface Coin {
  address: string;
  usdPrice: number;
  decimals: string;
  symbol: string;
  poolBalance: bigint | string;
}

export interface CurveLP {
  coins: Coin[];
  totalSupply: string;
}

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS],
});

const CURVE_LP_ADDRESS: string = `0x24699312CB27C26Cfc669459D670559E5E44EE60`;
const TIME_INTERVAL = 5 * 60 * 1000;

/**
 * Fetch the data for the TOR pool
 *
 */
const fetchTORPoolData = async (): Promise<CurveLP> => {
  const { data } = await axios.get(
    `https://api.curve.fi/api/getPools/fantom/factory`
  );
  return data.data.poolData.find(({ address }) => address === CURVE_LP_ADDRESS);
};

/**
 * Calculate the TOR supply based on the LP data
 *
 */
const calculateTORSupply = async (curveLpData: CurveLP) => {
  const { coins, totalSupply } = curveLpData;
  const [TOR_DATA, DAI_USDC_DATA] = coins;

  const poolBalanceTOR = parseInt(
    ethers.utils.formatUnits(TOR_DATA.poolBalance, TOR_DATA.decimals)
  );
  const formattedTotalSupply = parseInt(ethers.utils.formatEther(totalSupply));

  const percentTORSupply = (
    (poolBalanceTOR / formattedTotalSupply) *
    100
  ).toFixed(2);
  console.info(
    new Date(Date.now()).toISOString(),
    `${TOR_DATA.symbol} Supply:`,
    percentTORSupply
  );

  const guilds = await client.guilds.cache;
  guilds.forEach((guild) => {
    guild.me.setNickname(`${percentTORSupply}% ${TOR_DATA.symbol} Supply`);
  });

  return client.user.setPresence({
    status: "online",
    activities: [
      {
        name: `${TOR_DATA.symbol} & ${DAI_USDC_DATA.symbol} Supply`,
        type: "WATCHING",
      },
    ],
  });
};

client.once("ready", async () => {
  const curveLpData = {
    lpData: {},
    set setCurveLpData(lpData: CurveLP) {
      this.lpData = lpData;
      calculateTORSupply(lpData);
    },
  };

  curveLpData.setCurveLpData = await fetchTORPoolData();

  setInterval(async () => {
    curveLpData.setCurveLpData = await fetchTORPoolData();
  }, TIME_INTERVAL);
});

client
  .login(process.env.DISCORD_BOT_API_TOKEN)
  .then(() => console.log("Bot has succesfully logged in!"));
