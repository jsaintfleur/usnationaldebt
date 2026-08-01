# Methodology

## Observations

Current totals come from Treasury's Debt to the Penny endpoint. Comparable history is GFDEBTN, a Treasury series distributed through FRED in millions of dollars; ingestion converts it to dollars.

## Administration assignment

For a transition date, the system selects the latest quarterly observation whose date is not later than the transition. Start and end values therefore describe consistent quarter-end proxies, not inauguration-day balances. A current term ends at the runtime date and is labeled partial.

Increase equals end minus start. Percent change equals increase divided by start. CAGR uses elapsed calendar days divided by 365.2425. Average daily increase divides the nominal increase by elapsed calendar days.

These are period descriptions. Presidents do not independently control debt: Congress authorizes taxation and spending, while inherited statutes, economic conditions, emergencies, and interest obligations affect results.

## Forecast

The production baseline calculates the compound annual growth rate from the trailing ten years and recursively projects the last observation. Low/high paths subtract/add 1.8 percentage points to annual growth. They are sensitivity bounds, not calibrated confidence intervals or government projections.

## Revision policy

Official upstream revisions are accepted on refresh, then validated and reviewed in source control. Historic snapshot commits make changes auditable.
