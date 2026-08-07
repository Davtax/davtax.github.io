---
layout: about
title: about
permalink: /
subtitle: Postdoctoral Researcher in Quantum Physics, University of Augsburg

profile:
  align: right
  image: UniA.jpg
  image_circular: false # crops the image to make it circular
  more_info: >
    <p>University of Augsburg</p>
    <p>Augsburg 86159, Germany</p>

selected_papers: true # includes a list of papers marked as "selected={true}"
social: true # includes social icons at the bottom of the page

announcements:
  enabled: false # includes a list of news items
  scrollable: true # adds a vertical scroll bar if there are more than 3 news items
  limit: 5 # leave blank to include all the news in the `_news` folder

latest_posts:
  enabled: true
  scrollable: true # adds a vertical scroll bar if there are more than 3 new posts items
  limit: 3 # leave blank to include all the blog posts
---

<style>
  :root {
  {%- for item in site.data.venue_badge_colors.light -%}
  --{{ item[0] }}-badge-color: {{ item[1] }};
  {%- endfor -%}
  }

  html[data-theme="dark"] {
  {%- for item in site.data.venue_badge_colors.dark -%}
  --{{ item[0] }}-badge-color: {{ item[1] }};
  {%- endfor -%}
  }

  .social .contact-icons {
  font-size: 3rem;
  }
</style>

I am a physicist working on quantum information processing with semiconductor spin qubits. My research focuses on scalable quantum computation through spin control, long-range shuttling, and spin-orbit-driven gate operations in quantum dot platforms.

I currently hold a postdoctoral position at the University of Augsburg. Before that, I completed my PhD in Physics at Universidad Autonoma de Madrid, where my thesis focused on control and shuttling of hole spin qubits for scalable quantum architectures.

This site collects my CV, publications, and research news, and includes a blog section where I will post short notes and random facts over time.
