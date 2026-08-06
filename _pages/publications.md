---
layout: page
permalink: /publications/
title: publications
description: List of publications, including journal articles and preprints.
nav: true
nav_order: 2
---

<!-- _pages/publications.md -->

<!-- Bibsearch Feature -->

{% include bib_search.liquid %}

<!-- text color: light: #000000, dark: #E8E8E8 -->

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
</style>

<div class="publications">

{% bibliography %}

</div>
