// sequencerDomUtils.js
(function (window) {
  "use strict";

  let cachedChannels = [];

  function queryChannels() {
    return Array.from(document.querySelectorAll('.channel[id^="channel-"]'));
  }

  function channelsStillInDom(channels) {
    return channels.length && channels.every((channel) => document.contains(channel));
  }

  function getChannels() {
    if (window.channelsStore && window.channelsStore.length) {
      cachedChannels = window.channelsStore;
      return cachedChannels;
    }

    if (!channelsStillInDom(cachedChannels)) {
      cachedChannels = queryChannels();
    }

    return cachedChannels;
  }

  function getStepButtons(channel) {
    return channel ? channel.querySelectorAll('.step-button') : [];
  }

  window.SequencerDOM = {
    getChannels,
    getStepButtons,
  };
})(window);

