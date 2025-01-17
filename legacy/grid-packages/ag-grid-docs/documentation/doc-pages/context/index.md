---
title: "Context"
---

This sections covers how shared contextual information can be passed around the grid.

## Overview

The context object is passed to all callbacks and events used in the grid. The purpose of the context object is to allow the client application to pass details to custom callbacks such as the [Cell Renderers](/component-cell-renderer/) and [Cell Editors](/cell-editing/).

<api-documentation source='grid-options/properties.json' section='miscellaneous' names='["context"]' ></api-documentation>

To update the context call `api.setGridOption` with the new context. Alternatively, if you maintain a reference to the context object it's values can be mutated directly. 

## Context Object Example

The example below demonstrates how the context object can be used. Note the following:

- Selecting the reporting currency from the dropdown places it in the context object.

- When the reporting currency is changed the cell renderer uses the currency supplied in the context object to calculate the value using: `params.context.reportingCurrency`.

- The price column header is updated to show the selected currency using a header value getter using `ctx.reportingCurrency`.

<grid-example title='Context Object' name='context' type='mixed'></grid-example>


## Context & Expressions Example

Below shows a complex example making use of value getters (using expressions) and class rules (again using expressions). The grid shows 'actual vs budget data and yearly total' for widget sales split by city and country.

- The **Location** column is showing the aggregation groups, grouping by city and country.
- The **Monthly Data** columns are affected by the context. Depending on the selected period, the data displayed is either actual (`x_act`) or budgeted (`x_bud`) data for the month (eg. `jan_act` when Jan is green, or `jan_bud` when Jan is red). Similarly, the background color is also changed using class rules dependent on the selected period.
- **sum(YTD)** is the total of the 'actual' figures, i.e. adding up all the green. This also changes as the period is changed.

Notice that the example (including calculating the expression on the fly, the grid only calculates what's needed to be displayed) runs very fast (once the data is loaded) despite having over 6,000 rows.

This example is best viewed by opening it in a new tab.

<grid-example title='Monthly Sales' name='monthly-sales' type='mixed' options='{ "enterprise": true, "modules": ["clientside", "rowgrouping", "setfilter", "filterpanel"], "extras": ["fontawesome"] }'></grid-example>
