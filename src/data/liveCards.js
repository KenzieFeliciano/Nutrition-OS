// Rotating content for the "living" cards (Ancient Wisdom + Podcast Insight). The
// scene advances these on a timer and on click, so the cards never feel static.
import { wisdomFacts } from './wisdomFacts.js';

const podcastInsights = [
  {
    show: 'Huberman Lab',
    title: 'Morning light is a sleep nutrient.',
    quote: 'Ten to twenty minutes of outdoor light helps set the rhythm your appetite, focus, and recovery follow all day.',
    meta: 'Light and circadian rhythms · 4 days ago',
  },
  {
    show: 'Found My Fitness',
    title: 'The winter vitamin D dip.',
    quote: 'Most people drift below the optimal vitamin D range through winter, which quietly nudges mood and immunity.',
    meta: 'Micronutrients deep dive · 1 week ago',
  },
  {
    show: 'The Drive',
    title: 'Protein is a daily, not a dinner, habit.',
    quote: 'Spreading protein across the day rather than loading it at dinner is what actually preserves muscle as you age.',
    meta: 'Protein and longevity · 2 weeks ago',
  },
  {
    show: 'Huberman Lab',
    title: 'Magnesium before bed.',
    quote: 'For people who run low on dietary magnesium, a threonate form in the evening can measurably deepen sleep.',
    meta: 'Supplements for sleep · 5 days ago',
  },
  {
    show: 'Found My Fitness',
    title: 'Eat the whole rainbow.',
    quote: 'The colors in plants are the polyphenols. The wider your color range, the wider your micronutrient range.',
    meta: 'Polyphenols and aging · 3 days ago',
  },
  {
    show: 'Huberman Lab',
    title: 'Omega-3 feeds the brain.',
    quote: 'Around two grams of EPA omega-3 a day supports mood and focus about as much as it supports the heart.',
    meta: 'Nutrients for the brain · 6 days ago',
  },
];

function pickNext(state) {
  if (state.items.length < 2) {
    state.index = 0;
    return;
  }
  let next = state.index;
  while (next === state.index) next = Math.floor(Math.random() * state.items.length);
  state.index = next;
}

export const liveCards = {
  wisdom: { index: Math.floor(Math.random() * wisdomFacts.length), items: wisdomFacts },
  podcast: { index: Math.floor(Math.random() * podcastInsights.length), items: podcastInsights },
};

export const currentWisdom = () => liveCards.wisdom.items[liveCards.wisdom.index];
export const currentPodcast = () => liveCards.podcast.items[liveCards.podcast.index];
export const advanceWisdom = () => pickNext(liveCards.wisdom);
export const advancePodcast = () => pickNext(liveCards.podcast);
