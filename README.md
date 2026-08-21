# Kubernetes Learning Reference

A personal, interactive Kubernetes reference site, published with GitHub Pages.

- **Interactive cluster diagram** — click any component to see what it is and
  highlight everything it connects to; toggle layers (control plane,
  networking, storage, …) to isolate the part of the system you're trying to
  understand.
- **Component encyclopedia** — every object type (Pod, Deployment, Service,
  ConfigMap, PVC, …) with a plain-English explanation, real YAML, common
  `kubectl` commands, and gotchas.
- **YAML anatomy**, a searchable **kubectl cheat sheet**, a **hands-on
  tutorial** (Minikube → Pods → Deployments → Services → Config/Secrets → a
  two-tier web app + MongoDB capstone), and a **troubleshooting** quick
  reference.

Content is adapted from hands-on `kube-self-learn` notes. No build step —
plain HTML/CSS/JS, deployed via the included GitHub Actions workflow.

## Local preview

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```
