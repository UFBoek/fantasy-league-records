# FIG Dynasty Dominance v1

This is a research-only scoring-strength simulation for 2027 through 2032. It is not yet used by the website or the playoff calculator.

Run from the repository root using Node 22:

    node tests/test_dynasty_dominance.js
    node scripts/dynasty_dominance_model.js --runs 5000 --out /tmp/dynasty.json

Inputs: current rosters, league started-player game logs, RosterAudit values, actual future draft pick owners, and recent fantasy scoring.

The results compare every team's simulated legal superflex starting-lineup PPG and the probability of being the highest-scoring team. Assumed age-related performance change, injuries, rookie outcome distributions and player volatility are not historically calibrated. The recorded player logs include only fantasy-league starts, so players without starts use market-value scoring estimates rather than zero.

Future draft picks owned in 2027-2029 retain their actual owners. For years 2030-2032, each franchise is assumed to receive an original first-, second-, third- and fourth-round pick. No future trades or subjective owner skill bonuses are included.

**Do not publish forecast percentages as verified odds.** Review retrospective accuracy and run sensitivity tests before integrating this model into FIG.