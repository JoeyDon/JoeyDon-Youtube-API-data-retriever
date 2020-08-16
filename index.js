const fs = require("fs");
const path = require("path");
const axios = require("axios");

var accessToken = "Enter ur token here";
var apiKey = "Enter your google API key";
var localNextToken = false;
var videoCounts = 3000;
var rounds = 60;

const getVideoRequest = (nextPageToken) => {
  return new Promise((resolve, reject) => {
    let query = `https://www.googleapis.com/youtube/v3/videos?part=statistics%2CcontentDetails%2Csnippet&maxResults=${videoCounts}&chart=mostPopular&regionCode=au&key=${apiKey}`;

    if (nextPageToken) {
      console.log(`found nextpagetoken`);
      query = `https://www.googleapis.com/youtube/v3/videos?pageToken=${nextPageToken}&part=statistics%2CcontentDetails%2Csnippet&maxResults=${videoCounts}&chart=mostPopular&regionCode=au&key=${apiKey}`;
    }
    axios
      .get(query, {
        headers: {
          Authorization: accessToken,
        },
      })
      .then((response) => {
        // console.log(response.data);
        localNextToken = response.data.nextPageToken;

        return resolve(response.data);
      })
      .catch(function (error) {
        // handle error
        console.log(error);
      });
  });
};

const getChannelRequest = (channelID) => {
  return new Promise((resolve, reject) => {
    let query = `https://www.googleapis.com/youtube/v3/channels?part=statistics%2CbrandingSettings%2Csnippet&id=${channelID}&maxResults=1&key=AIzaSyCSCOSnXeNxm2eidrslMD7Imvj9NXhT_oA`;

    axios
      .get(query, {
        headers: {
          Authorization: accessToken,
        },
      })
      .then((response) => {
        // console.log(response.data.items[0].statistics);
        // localNextToken = response.data.nextPageToken;

        return resolve(response.data);
      })
      .catch(function (error) {
        // handle error
        console.log(error);
      });
  });
};

const washVideoData = (data) => {
  return new Promise((resolve, reject) => {
    for (let i = 0; i < data.items.length; i++) {
      // contentDetails
      data.items[i].duration = data.items[i].contentDetails.duration;
      delete data.items[i].contentDetails;

      // snippet
      data.items[i].videoPublishedAt = data.items[i].snippet.publishedAt;
      data.items[i].videoTitle = data.items[i].snippet.title;
      data.items[i].videoDescription = data.items[i].snippet.description;
      data.items[i].channelTitle = data.items[i].snippet.channelTitle;
      if (data.items[i].snippet.tags)
        data.items[i].videoTagsCount = data.items[i].snippet.tags.length;

      data.items[i].videoCategoryId = data.items[i].snippet.categoryId;
      data.items[i].channelId = data.items[i].snippet.channelId;
      delete data.items[i].snippet;

      // statistics
      data.items[i].videoStatistics = data.items[i].statistics;
      delete data.items[i].statistics;
    }
    resolve(data);
  });
};

const washChannelData = (video, channelInfo) => {
  return new Promise((resolve, reject) => {
    let formattedVideo = {
      ...video,
      channelStatistics: channelInfo.statistics,
      channelTitle: channelInfo.snippet.title,
      channelDescription: channelInfo.snippet.description,
      channelPublishedAt: channelInfo.snippet.publishedAt,
      channelBrandKeywords: channelInfo.brandingSettings.channel.keywords,
      channelDefaultLang: channelInfo.brandingSettings.channel.defaultLanguage,
    };
    resolve(formattedVideo);
  });
};

const writeDataToJson = (data) => {
  return new Promise((resolve, reject) => {
    fs.appendFile("result.json", JSON.stringify(data.items), (err) => {
      if (err) throw err;
      console.log("Data written to file");
      resolve("completed");
    });
  });
};

const handler = async () => {
  for (let i = 0; i < rounds; i++) {
    console.log(`round ${i} started`);

    // 1.Get videos
    let videoResult = await getVideoRequest(localNextToken);

    // 2. Wash videos key
    let washedVideos = await washVideoData(videoResult);

    // 3. Add channel info to each video
    for (let j = 0; j < washedVideos.items.length; j++) {
      console.log(`round ${i} - video ${50 * i + j} is processing`);

      let channelInfo = await getChannelRequest(
        washedVideos.items[j].channelId
      );

      washedVideos.items[j] = await washChannelData(
        washedVideos.items[j],
        channelInfo.items[0]
      );

      //   console.log(washedVideos.items[i]);
    }

    await writeDataToJson(washedVideos);

    console.log(`round ${i} finished`);
  }
};

handler();
