# ML gap register

| Priority | Gap | Risk | Required next step |
|---|---|---|---|
| P1 | No monthly multivariate target | Trend dominates annual debt level | Ingest monthly deficit and macro vintage data; evaluate monthly debt change |
| P1 | Intervals use empirical residual scaling, not conformal calibration | Coverage may drift under structural breaks | Add horizon-specific conformal backtests and coverage monitoring |
| P1 | No vintage database | Revised macro data may differ from historically available values | Use ALFRED vintages before adding macro features |
| P2 | Political features excluded | No incremental-value claim can be made | Test presidential-only, congressional-only, and combined encodings after sample expansion |
| P2 | No automatic drift alert destination | Failures are visible only in Actions | Configure an authorized alert channel and rollback workflow |
