# Trained ML models (webapp)

Train sklearn **C_ML** and **Anom_ML** from ISOT simulation data:

```bash
cd backend
PYTHONPATH=. python scripts/train_ml_models.py
```

Default: **2000 users**, full ISOT (~45k posts), **70% train split**, 449k simulated votes.

Artifacts:

| File | Model |
|------|--------|
| `c_ml.joblib` | Post credibility (LogisticRegression, 5 features) |
| `anom_ml.joblib` | User anomaly (LogisticRegression, 11 features) |
| `metadata.json` | Training run metadata |

The webapp loads these at startup when `NCPS_LOCAL_ML_ENABLED=true` (default).
Set `NCPS_ML_MODELS_DIR` to override this directory.

Smoke test (fast, not for production):

```bash
PYTHONPATH=. python scripts/train_ml_models.py --users 70 --fast
```
