const axios = require("axios");
const { Client, Intents } = require("discord.js");
const ethers = require("ethers");

require("dotenv").config();

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS],
});

const CURVE_LP_ADDRESS = `0x24699312CB27C26Cfc669459D670559E5E44EE60`;
const TIME_INTERVAL = 10 * 60 * 1000;

/**
 * Fetch the data for the TOR pool
 *
 * @return {Promise<*>}
 */
const fetchTORPoolData = async () => {
  const { data } = await axios.get(
    `https://api.curve.fi/api/getPools/fantom/factory`
  );
  return data.data.poolData.find(({ address }) => address === CURVE_LP_ADDRESS);
};

/**
 * Calculate the TOR supply based on the LP data
 *
 * @param {object} curveLpData
 * @return {Promise<void>}
 */
const calculateTORSupply = async (curveLpData) => {
  const { coins, usdTotal } = curveLpData;
  const [TOR_DATA, DAI_USDC_DATA] = coins;

  const poolBalanceTOR = ethers.utils.formatUnits(
    TOR_DATA.poolBalance,
    TOR_DATA.decimals
  );

  const percentTORSupply = ((poolBalanceTOR / usdTotal) * 100).toFixed(2);
  console.info(`TOR Supply:`, percentTORSupply);

  const guilds = await client.guilds.cache;
  guilds.forEach((guild) => {
    guild.me.setNickname(`${percentTORSupply}% ${TOR_DATA.symbol} Supply`);
  });

  client.user.setPresence({
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
    set setCurveLpData(lpData) {
      this.lpData = lpData;
      calculateTORSupply(lpData);
    },
  };

  curveLpData.setCurveLpData = await fetchTORPoolData();

  setInterval(async () => {
    curveLpData.setCurveLpData = await fetchTORPoolData();
  }, TIME_INTERVAL);
});

client.login(process.env.DISCORD_BOT_API_TOKEN);
