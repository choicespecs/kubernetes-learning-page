/* ==========================================================================
   Kubernetes Learning Reference — content data
   Single source of truth for the interactive diagram AND the written
   reference cards, so clicking a diagram node and reading the reference
   always show the same information.
   ========================================================================== */

/* ---- Components encyclopedia ------------------------------------------- */
/* description supports a tiny markdown subset: \n\n = paragraph break,
   "- " at line start = bullet, `code` = inline code, **bold** = bold.     */

const COMPONENTS = {

  kubectl: {
    name: "kubectl",
    category: "Client",
    summary: "The CLI you run on your own machine to talk to a cluster.",
    description:
      "`kubectl` is installed on *your* machine, not the cluster. It never talks to nodes or containers directly — every single command it sends goes through the **API Server**.\n\nIt needs a **kubeconfig** file (cluster address + auth cert/key) to know which cluster to talk to and prove who you are. `minikube start` writes this file for you automatically at `~/.kube/config`.",
    commands: [
      { cmd: "kubectl get nodes", desc: "list nodes in the cluster kubectl is currently pointed at" },
      { cmd: "kubectl config current-context", desc: "show which cluster/context kubectl is using right now" },
      { cmd: "kubectl version --client", desc: "check the installed client version" },
    ],
    tips: [
      "If `kubectl` seems to be talking to the wrong cluster, check `kubectl config get-contexts` before anything else.",
    ],
    related: ["apiserver"],
  },

  apiserver: {
    name: "API Server",
    category: "Control Plane",
    summary: "The front door. Every request into the cluster passes through here.",
    description:
      "The API server is the **only** control-plane component that talks directly to `etcd`. Every client — `kubectl`, a web dashboard, another program using the API — goes through it, and it validates every request before doing anything.\n\nThink of it as the receptionist, security guard, and record-keeper in one: it authenticates you, checks whether you're allowed to do what you're asking, writes the result to `etcd`, and then hands off work to the scheduler or kubelets as needed.",
    yaml: null,
    commands: [
      { cmd: "kubectl proxy", desc: "open a local proxy straight to the API server, useful for hitting the raw REST API" },
    ],
    tips: [
      "**Request flow**, step by step, for something like `kubectl apply -f pod.yaml`:\n- `kubectl` sends the manifest to the API server\n- API server validates it and writes the desired state to `etcd`\n- API server asks the **Scheduler** which node should run it (if not already assigned)\n- Scheduler picks a node; API server records that decision in `etcd`\n- API server tells the chosen node's **kubelet** to create it\n- kubelet runs the container via the container runtime, then reports status back to the API server, which writes it to `etcd`",
    ],
    related: ["etcd", "scheduler", "controllermanager", "kubelet", "kubectl"],
  },

  etcd: {
    name: "etcd",
    category: "Control Plane",
    summary: "The cluster's brain — a key-value store holding all cluster state.",
    description:
      "A strongly-consistent distributed key-value store that holds **everything**: what nodes exist, what pods should exist, their current status, config, secrets — all of it. Nothing but the API server reads or writes to it directly.\n\nBackups and disaster recovery for a cluster are, in practice, backups of `etcd`. Lose `etcd` with no backup and you lose the cluster's memory of everything it was managing.",
    tips: [
      "Production clusters should run **at least 2 masters** — losing your only master (and its `etcd`) means losing cluster access entirely.",
    ],
    related: ["apiserver"],
  },

  scheduler: {
    name: "Scheduler",
    category: "Control Plane",
    summary: "Decides which worker node a new Pod should run on.",
    description:
      "When a new Pod is created with no node assigned yet, the Scheduler picks one — based on available CPU/memory on each node, and any placement rules you've set (like `nodeSelector` or affinity rules). It doesn't run anything itself; it just makes the decision and hands it back to the API server.",
    yaml:
      "spec:\n  nodeSelector:\n    kubernetes.io/hostname: node1   # force a pod onto a specific node,\n                                     # bypassing normal scheduler placement",
    related: ["apiserver", "kubelet"],
  },

  controllermanager: {
    name: "Controller Manager",
    category: "Control Plane",
    summary: "Runs the background loops that keep reality matching your YAML.",
    description:
      "The \"sheriff\" of the cluster — it runs many independent controllers in the background, each watching one type of resource and reconciling actual state against desired state. This is the mechanism behind **self-healing**: when a ReplicaSet says it wants 3 pods and only 2 exist, a controller here notices and creates the third.\n\nIt also manages namespaces, RBAC, and service accounts under the hood.",
    related: ["apiserver", "replicaset"],
  },

  node: {
    name: "Worker Node",
    category: "Node",
    summary: "A machine (VM or bare metal) that actually runs your Pods.",
    description:
      "A Node provides the CPU and memory that Pods consume. A **cluster** is just a pool of nodes working together as one combined resource pool. Most clusters dedicate the control-plane node to managing the cluster and schedule regular workloads only onto worker nodes.",
    related: ["kubelet", "pod"],
  },

  kubelet: {
    name: "kubelet",
    category: "Node",
    summary: "Runs on every node — the \"eyes and ears\" that actually starts containers.",
    description:
      "The kubelet is an agent running on every node (including the control-plane node). It receives instructions from the API server (\"run this Pod\"), tells the local **container runtime** to actually start/stop/restart the containers, and continuously reports status back up to the API server.\n\nIf a node's kubelet stops responding, the control plane considers that node unreachable — the pods on it get rescheduled elsewhere once it's marked `NotReady`.",
    related: ["apiserver", "containerruntime", "pod"],
  },

  containerruntime: {
    name: "Container Runtime",
    category: "Node",
    summary: "containerd / CRI-O / Docker — actually builds and runs the containers.",
    description:
      "The low-level engine that does the real work of pulling images and running containers. The kubelet issues it `docker run`-style commands — you never interact with the runtime directly. Kubernetes itself is runtime-agnostic as long as the runtime implements the **CRI** (Container Runtime Interface).",
    related: ["kubelet"],
  },

  namespace: {
    name: "Namespace",
    category: "Cluster Organization",
    summary: "A logical partition inside a cluster for grouping and isolating resources.",
    description:
      "Namespaces let you split one cluster into logical sub-clusters — `default`, `kube-system` (cluster-internal components), or custom ones you create. If you don't specify a namespace, objects go into whichever one your current **context** defaults to.\n\n**ConfigMaps and Secrets must live in the same namespace as the Pods that use them** — this trips people up constantly.",
    yaml:
      "apiVersion: v1\nkind: ResourceQuota\nmetadata:\n  name: demo-quota\n  namespace: demo\nspec:\n  hard:\n    cpu: \"1\"\n    memory: 1Gi",
    commands: [
      { cmd: "kubectl create namespace demo", desc: "create a namespace imperatively" },
      { cmd: "kubectl get pods -n demo", desc: "list pods in a specific namespace" },
      { cmd: "kubectl get pods -A", desc: "list pods across every namespace" },
    ],
    tips: [
      "A **ResourceQuota** attached to a namespace hard-caps total resource consumption — think of it as a bouncer: once the namespace hits its cap, new pods requesting more are denied.",
    ],
    related: ["configmap", "secret"],
  },

  deployment: {
    name: "Deployment",
    category: "Workloads",
    summary: "A blueprint for Pods: which image, how many replicas, how to roll out updates.",
    description:
      "In practice you almost never create a bare Pod — you create a Deployment, and it creates a **ReplicaSet**, which is the thing that actually keeps the desired number of Pods alive.\n\n**Deployment → creates/manages → ReplicaSet → creates/manages → Pod(s)**\n\nWhen you change the Pod template (say, a new image tag) and re-apply, the Deployment creates a *new* ReplicaSet and performs a **rolling update**: surge one new pod, remove one old pod, repeat — the total count never dips below the desired replica count during the swap.",
    yaml:
      "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: hello-deploy\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: hello        # must match template.metadata.labels exactly\n  template:\n    metadata:\n      labels:\n        app: hello\n    spec:\n      containers:\n        - name: hello-container\n          image: nginx:alpine\n          ports:\n            - containerPort: 80",
    commands: [
      { cmd: "kubectl apply -f deployment.yaml", desc: "create/update the deployment" },
      { cmd: "kubectl scale deployment hello-deploy --replicas=5", desc: "change replica count" },
      { cmd: "kubectl rollout status deployment/hello-deploy", desc: "watch a rollout in progress" },
      { cmd: "kubectl rollout undo deployment/hello-deploy", desc: "roll back to the previous revision" },
      { cmd: "kubectl rollout history deployment/hello-deploy", desc: "view revision history" },
    ],
    tips: [
      "`spec.selector.matchLabels` must match `spec.template.metadata.labels` exactly — that's the whole mechanism the Deployment uses to recognize \"these are my pods.\"",
      "Deleting a pod that belongs to a Deployment doesn't remove it — it's recreated almost immediately. The only way to truly remove them is to delete the Deployment or scale it to 0.",
    ],
    related: ["replicaset", "pod", "controllermanager"],
  },

  replicaset: {
    name: "ReplicaSet",
    category: "Workloads",
    summary: "Keeps a fixed number of identical Pods alive at all times.",
    description:
      "You almost never create a ReplicaSet directly — a Deployment creates and manages one for you. Its entire job is to keep asking, in a loop, forever: \"does the actual number of matching pods equal the desired number?\" and fixing it when the answer is no. This is the mechanism behind self-healing.\n\nReplicaSets alone are hard to use for rolling updates in production, which is exactly why Deployments exist — they layer version control on top.",
    related: ["deployment", "pod"],
  },

  pod: {
    name: "Pod",
    category: "Workloads",
    summary: "The smallest deployable unit — a thin wrapper around one or more containers.",
    description:
      "Kubernetes manages Pods, not containers directly. Most Pods wrap exactly one container, though a Pod *can* hold more (sidecar patterns). Each Pod gets its own internal IP address.\n\n**Pods are ephemeral** — they can die and get recreated, and they get a brand-new IP every time. This is precisely the problem Services exist to solve.\n\nApplying a bare Pod's YAML does **not** create anything that watches over it — `kubectl apply` reads the file, creates the Pod, and exits. Nothing is left behind that keeps re-checking whether it still exists. Delete it by hand and it stays gone, even though the YAML file is still sitting right there on disk, untouched.",
    yaml:
      "apiVersion: v1\nkind: Pod\nmetadata:\n  name: hello-pod\n  labels:\n    app: hello\nspec:\n  containers:\n    - name: hello-container\n      image: nginx:alpine\n      ports:\n        - containerPort: 80",
    commands: [
      { cmd: "kubectl apply -f pod.yaml", desc: "create the pod (one-time, declarative)" },
      { cmd: "kubectl get pods", desc: "list pods — watch the READY and STATUS columns" },
      { cmd: "kubectl describe pod hello-pod", desc: "deep detail + an Events timeline — first stop when something's broken" },
      { cmd: "kubectl logs hello-pod", desc: "view stdout/stderr" },
      { cmd: "kubectl exec -it hello-pod -- sh", desc: "open an interactive shell inside the pod" },
      { cmd: "kubectl port-forward pod/hello-pod 8080:80", desc: "tunnel a local port straight to the pod" },
      { cmd: "kubectl delete pod hello-pod", desc: "delete the live object (does not touch the YAML file)" },
    ],
    tips: [
      "`READY 0/1` means the container isn't up yet, or crashed — that's your first red flag something's wrong.",
      "Restarts climbing repeatedly means the container is crash-looping — check `kubectl logs` and `kubectl describe pod` (Events section) next.",
    ],
    related: ["replicaset", "containerruntime", "configmap", "secret", "pvc", "service"],
  },

  statefulset: {
    name: "StatefulSet",
    category: "Workloads",
    summary: "Like a Deployment, but for stateful apps that need stable identity and storage.",
    description:
      "Used for databases (MySQL, MongoDB, Elasticsearch) and anything else needing synchronized, ordered reads/writes across replicas and a stable per-pod identity + storage. Considerably more complex to operate correctly than a Deployment — many teams deliberately host their database *outside* the Kubernetes cluster and only run stateless apps inside it via Deployments.",
    related: ["deployment", "pvc"],
  },

  configmap: {
    name: "ConfigMap",
    category: "Config & Storage",
    summary: "Non-sensitive configuration, stored as a cluster object outside the app image.",
    description:
      "Lets a container image stay identical across dev/staging/prod — only the injected config differs. Change a value without rebuilding or redeploying the image.\n\nTwo ways to attach it to a Pod:\n- as an **environment variable** via `valueFrom.configMapKeyRef` (quick, one key at a time)\n- as a **mounted volume** (good for whole config files) — requires adding it under `spec.volumes` *and* mounting it in the container under `volumeMounts`",
    yaml:
      "env:\n  - name: GREETING\n    valueFrom:\n      configMapKeyRef:\n        name: hello-config\n        key: GREETING\n\n# --- or, as a mounted file ---\nspec:\n  volumes:\n    - name: dc-heroes\n      configMap:\n        name: dem-heroes\n  containers:\n    - name: nginx\n      volumeMounts:\n        - name: dc-heroes\n          mountPath: /heroes",
    commands: [
      { cmd: "kubectl create configmap hello-config --from-literal=GREETING=hi", desc: "create from a literal key/value" },
      { cmd: "kubectl create configmap dem-heroes --from-file=heroes.txt", desc: "create from a file's contents" },
      { cmd: "kubectl get configmap hello-config -o yaml", desc: "inspect the stored object" },
    ],
    tips: [
      "**Gotcha:** mounting a ConfigMap volume onto a directory that already has files **wipes that directory**. To add a single file without clobbering the rest (e.g. `/etc/nginx`), use `subPath`.",
      "A typo in `key:` (must match `--from-literal`/the data key exactly) is the single most common cause of `CreateContainerConfigError`.",
    ],
    related: ["pod", "secret", "namespace"],
  },

  secret: {
    name: "Secret",
    category: "Config & Storage",
    summary: "Like a ConfigMap, but for sensitive values — passwords, tokens, certs.",
    description:
      "Mounts and injects exactly like a ConfigMap, but Kubernetes stores the value **base64-encoded** rather than plaintext.\n\n⚠️ **Base64 is encoding, not encryption.** Anyone with API or `etcd` access can trivially decode it. Production setups need a real secrets-encryption layer on top (sealed-secrets, an external vault, etc.) — this alone is not a security boundary.",
    yaml:
      "apiVersion: v1\nkind: Secret\nmetadata:\n  name: mongo-secret\ntype: Opaque\ndata:\n  mongo-user: YWRtaW4=            # base64 of \"admin\"\n  mongo-password: Y2hhbmdlbWUxMjM=  # base64 of \"changeme123\"",
    commands: [
      { cmd: "echo -n 'admin' | base64", desc: "encode a value before pasting it into a Secret manifest" },
      { cmd: "kubectl create secret generic hello-secret --from-literal=API_KEY=xyz", desc: "create imperatively" },
      { cmd: "kubectl get secret hello-secret -o jsonpath='{.data.API_KEY}' | base64 -d", desc: "decode a stored value back out" },
    ],
    tips: [
      "Common `type:` values: `Opaque` (generic — the default), `kubernetes.io/basic-auth`, `kubernetes.io/ssh-auth`, `kubernetes.io/tls`.",
    ],
    related: ["pod", "configmap"],
  },

  storageclass: {
    name: "StorageClass",
    category: "Config & Storage",
    summary: "Teaches the cluster how to provision a type of storage.",
    description:
      "Kubernetes itself is storage-agnostic — a StorageClass tells it *how* to carve out storage on a given backend (AWS EBS, Azure Disk, a local/manual `hostPath`, etc.). It's the first link in the storage chain:\n\n**StorageClass → PersistentVolume → PersistentVolumeClaim → Volume on Pod → volumeMount on Container**",
    related: ["pv"],
  },

  pv: {
    name: "PersistentVolume (PV)",
    category: "Config & Storage",
    summary: "An actual chunk of storage, carved out per a StorageClass.",
    description:
      "Represents real storage capacity available to the cluster — think of it as \"a storage locker that exists.\" It's provisioned according to a StorageClass and then bound to exactly one PersistentVolumeClaim.",
    yaml:
      "apiVersion: v1\nkind: PersistentVolume\nmetadata:\n  name: nginx-pv\nspec:\n  storageClassName: manual\n  capacity:\n    storage: 2Gi\n  accessModes:\n    - ReadWriteOnce      # only one node can mount it read-write at a time\n  hostPath:\n    path: /mnt/data",
    related: ["storageclass", "pvc"],
  },

  pvc: {
    name: "PersistentVolumeClaim (PVC)",
    category: "Config & Storage",
    summary: "The \"key\" that binds to a PV — a Pod's request for storage.",
    description:
      "A PVC is a **1:1** binding to one PV — think \"locker key\" to the PV's \"locker.\" If a PVC requests less capacity than a PV offers, it still binds and simply reports the PV's larger size; nothing is split or wasted.\n\nOnce bound, it's attached to a Pod the same two-step way as a ConfigMap: add it under `spec.volumes`, then mount it into the container with `volumeMounts`.",
    yaml:
      "apiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: nginx-pvc\nspec:\n  storageClassName: manual\n  accessModes:\n    - ReadWriteOnce\n  resources:\n    requests:\n      storage: 1Gi\n---\n# attaching it to a pod:\nspec:\n  volumes:\n    - name: nginx-pv-storage\n      persistentVolumeClaim:\n        claimName: nginx-pvc\n  containers:\n    - name: nginx\n      volumeMounts:\n        - name: nginx-pv-storage\n          mountPath: /data",
    tips: [
      "Data survives pod deletion/recreation only as long as the new pod lands on the same node (for `hostPath`-style local storage) — or the storage is genuinely networked/shared.",
      "Kubernetes does **not** manage backup or replication of this data. That's entirely on you.",
    ],
    related: ["pv", "pod"],
  },

  service: {
    name: "Service",
    category: "Networking",
    summary: "A stable, permanent address for a set of Pods that keeps changing.",
    description:
      "Every Pod gets its own IP, but Pods are disposable — delete one and its replacement gets a *different* IP. A Service solves this: it's a stable IP/DNS name that automatically tracks whichever Pods currently match its label selector, no matter how many times they're replaced. It also load-balances across all matching Pods (round-robin by default, via **kube-proxy** running on every node).\n\nKubernetes gives every Service a DNS name matching its `metadata.name` — so `mongo-service` resolves automatically from any Pod in the same namespace, no IP hardcoding needed.",
    yaml:
      "apiVersion: v1\nkind: Service\nmetadata:\n  name: hello-service\nspec:\n  type: ClusterIP        # or NodePort / LoadBalancer\n  selector:\n    app: hello            # matches pod labels\n  ports:\n    - port: 80             # the Service's own port\n      targetPort: 80        # the port the container actually listens on",
    commands: [
      { cmd: "kubectl expose deployment hello-deploy --port=80 --target-port=80", desc: "quickly create a ClusterIP Service for a Deployment" },
      { cmd: "kubectl get service hello-service", desc: "check its stable CLUSTER-IP" },
      { cmd: "minikube service hello-service --url", desc: "get a browser-reachable URL on Minikube" },
    ],
    tips: [
      "**ClusterIP** (default) — internal only, pod-to-pod.",
      "**NodePort** — opens a port in the `30000–32767` range on every node; reachable via `<node-ip>:<nodePort>` no matter which node you hit.",
      "**LoadBalancer** — provisions an external load balancer (cloud providers auto-provision one); smarter routing than plain round-robin.",
    ],
    related: ["pod", "ingress", "deployment"],
  },

  ingress: {
    name: "Ingress",
    category: "Networking",
    summary: "Routes external HTTP(S) traffic to the right Service, with clean URLs.",
    description:
      "Sits in front of one or more Services and routes incoming traffic based on hostname/path rules. Enables a real domain name + HTTPS instead of forcing users to hit `http://<node-ip>:<nodePort>` directly.",
    related: ["service"],
  },

  networkpolicy: {
    name: "NetworkPolicy",
    category: "Networking",
    summary: "Firewall rules between Pods — controls ingress/egress traffic.",
    description:
      "Scoped to a namespace. Uses a `podSelector` to decide which Pods the policy applies to, then further selectors (`podSelector`, `namespaceSelector`, `ipBlock`) to decide who they're allowed to talk to. **Everything not explicitly allowed is denied** once a policy applies to a Pod — think of it as a strict helicopter parent for network access.",
    yaml:
      "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: default-deny\n  namespace: default\nspec:\n  podSelector: {}       # empty = applies to ALL pods in the namespace\n  policyTypes:\n    - Ingress\n    - Egress\n  # no rules defined = deny everything\n---\n# only allow ingress from pods labeled run: client\nspec:\n  podSelector:\n    matchLabels:\n      app: demo-deploy\n  policyTypes:\n    - Ingress\n  ingress:\n    - from:\n        - podSelector:\n            matchLabels:\n              run: client\n      ports:\n        - port: 80",
    tips: [
      "Selector options inside `from`/`to` blocks (`ipBlock`, `namespaceSelector`, `podSelector`) combine with **OR** logic, not AND — be precise or you'll allow more than intended.",
    ],
    related: ["pod", "namespace"],
  },

  probes: {
    name: "Probes",
    category: "Workloads",
    summary: "Liveness and readiness health checks, set at the container level.",
    description:
      "**Liveness probe** — after N consecutive failures, Kubernetes **kills and restarts** the container.\n\n**Readiness probe** — after N consecutive failures, the Pod is **removed from Service traffic** (not killed) until it passes again. Same YAML syntax, just under `readinessProbe` instead.",
    yaml:
      "livenessProbe:\n  httpGet:\n    path: /healthz\n    port: 8080\n  initialDelaySeconds: 2   # wait before the first probe\n  periodSeconds: 5         # how often to probe\n  timeoutSeconds: 1        # how long to wait for a response\n  failureThreshold: 3      # consecutive failures before action",
    related: ["pod", "service"],
  },
};

/* Ordered category list (drives grouping in the Reference section) */
const COMPONENT_CATEGORIES = [
  "Client",
  "Control Plane",
  "Node",
  "Cluster Organization",
  "Workloads",
  "Config & Storage",
  "Networking",
];

/* ---- Diagram: nodes ------------------------------------------------------
   x, y, w, h are in the diagram's own coordinate space (viewBox 0 0 1240 900).
   layer ties into the toggle filters. group is used to draw dashed boundary
   boxes (control plane / worker node / namespace).                        */

const DIAGRAM_NODES = [
  // client / external
  { id: "kubectl", label: "kubectl", sublabel: "(your machine)", x: 40, y: 60, w: 140, h: 56, layer: "client" },
  { id: "external-user", label: "External User", sublabel: "browser", x: 40, y: 220, w: 140, h: 56, layer: "client" },

  // control plane
  { id: "apiserver", label: "API Server", sublabel: "", x: 300, y: 60, w: 150, h: 56, layer: "control-plane", group: "cp" },
  { id: "etcd", label: "etcd", sublabel: "cluster state", x: 500, y: 30, w: 130, h: 50, layer: "control-plane", group: "cp" },
  { id: "scheduler", label: "Scheduler", sublabel: "", x: 500, y: 96, w: 130, h: 50, layer: "control-plane", group: "cp" },
  { id: "controllermanager", label: "Controller Mgr", sublabel: "", x: 660, y: 30, w: 150, h: 50, layer: "control-plane", group: "cp" },

  // node
  { id: "kubelet", label: "kubelet", sublabel: "", x: 300, y: 200, w: 140, h: 50, layer: "node", group: "node" },
  { id: "containerruntime", label: "Container Runtime", sublabel: "containerd", x: 470, y: 200, w: 170, h: 50, layer: "node", group: "node" },

  // namespace / workload chain
  { id: "namespace", label: "Namespace", sublabel: "", x: 40, y: 300, w: 1160, h: 590, layer: "workload", group: "ns", isBoundary: true },
  { id: "deployment", label: "Deployment", sublabel: "", x: 60, y: 340, w: 150, h: 54, layer: "workload" },
  { id: "replicaset", label: "ReplicaSet", sublabel: "", x: 280, y: 340, w: 150, h: 54, layer: "workload" },
  { id: "pod", label: "Pod", sublabel: "", x: 500, y: 340, w: 150, h: 54, layer: "workload" },
  { id: "containerruntime2", label: "Container(s)", sublabel: "", x: 720, y: 340, w: 150, h: 54, layer: "workload", isAlias: "containerruntime" },

  // config/storage feeding the pod
  { id: "configmap", label: "ConfigMap", sublabel: "", x: 500, y: 442, w: 150, h: 50, layer: "config", group: "cfg" },
  { id: "secret", label: "Secret", sublabel: "", x: 500, y: 506, w: 150, h: 50, layer: "config", group: "cfg" },
  { id: "storageclass", label: "StorageClass", sublabel: "", x: 850, y: 430, w: 150, h: 46, layer: "config", group: "storage" },
  { id: "pv", label: "PersistentVolume", sublabel: "", x: 850, y: 506, w: 150, h: 46, layer: "config", group: "storage" },
  { id: "pvc", label: "PersistentVolumeClaim", sublabel: "", x: 850, y: 582, w: 150, h: 46, layer: "config", group: "storage" },

  // networking
  { id: "service", label: "Service", sublabel: "", x: 300, y: 600, w: 150, h: 54, layer: "network" },
  { id: "ingress", label: "Ingress", sublabel: "", x: 300, y: 720, w: 150, h: 54, layer: "network" },
  { id: "networkpolicy", label: "NetworkPolicy", sublabel: "", x: 850, y: 720, w: 150, h: 54, layer: "network" },
];

/* ---- Diagram: edges ------------------------------------------------------
   style: "solid" | "dashed"                                               */

const DIAGRAM_EDGES = [
  { from: "kubectl", to: "apiserver", label: "kubectl commands", layer: "client", style: "solid" },
  { from: "apiserver", to: "etcd", label: "reads / writes state", layer: "control-plane", style: "solid" },
  { from: "apiserver", to: "scheduler", label: "requests placement", layer: "control-plane", style: "solid" },
  { from: "apiserver", to: "controllermanager", label: "watched by", layer: "control-plane", style: "solid" },
  { from: "apiserver", to: "kubelet", label: "instructs", layer: "node", style: "solid" },
  { from: "kubelet", to: "apiserver", label: "reports status", layer: "node", style: "dashed" },
  { from: "kubelet", to: "containerruntime", label: "runs containers", layer: "node", style: "solid" },

  { from: "deployment", to: "replicaset", label: "creates", layer: "workload", style: "solid" },
  { from: "replicaset", to: "pod", label: "creates", layer: "workload", style: "solid" },
  { from: "pod", to: "containerruntime2", label: "wraps", layer: "workload", style: "solid" },
  { from: "controllermanager", to: "replicaset", label: "reconciles count", layer: "workload", style: "dashed" },

  { from: "configmap", to: "pod", label: "env / volume", layer: "config", style: "solid" },
  { from: "secret", to: "pod", label: "env / volume", layer: "config", style: "solid" },
  { from: "storageclass", to: "pv", label: "provisions", layer: "config", style: "solid" },
  { from: "pv", to: "pvc", label: "binds 1:1", layer: "config", style: "solid" },
  { from: "pvc", to: "pod", label: "mounted volume", layer: "config", style: "solid" },

  { from: "service", to: "pod", label: "routes via label selector", layer: "network", style: "solid" },
  { from: "ingress", to: "service", label: "routes HTTP(S)", layer: "network", style: "solid" },
  { from: "external-user", to: "ingress", label: "HTTPS request", layer: "client", style: "solid" },
  { from: "networkpolicy", to: "pod", label: "allow / deny traffic", layer: "network", style: "dashed" },
];

const DIAGRAM_GROUPS = {
  cp: { label: "Control Plane Node", x: 280, y: 10, w: 550, h: 156 },
  node: { label: "Worker Node", x: 280, y: 180, w: 380, h: 90 },
};

const DIAGRAM_LAYERS = [
  { id: "client", label: "Client & External" },
  { id: "control-plane", label: "Control Plane" },
  { id: "node", label: "Node Internals" },
  { id: "workload", label: "Workload Chain" },
  { id: "config", label: "Config & Storage" },
  { id: "network", label: "Networking" },
];

/* ---- kubectl cheat sheet -------------------------------------------------*/

const KUBECTL_CHEATSHEET = [
  { cmd: "kubectl get pods", desc: "list objects in the current namespace", cat: "Inspect" },
  { cmd: "kubectl get pods -n <ns>", desc: "list objects in a specific namespace", cat: "Inspect" },
  { cmd: "kubectl get pods -A", desc: "list across all namespaces", cat: "Inspect" },
  { cmd: "kubectl get pods -L <label-key>", desc: "add a column showing a label's value", cat: "Inspect" },
  { cmd: "kubectl get pods --selector app=nginx", desc: "filter by label", cat: "Inspect" },
  { cmd: "kubectl get all", desc: "list deployments, pods, services in one view", cat: "Inspect" },
  { cmd: "kubectl get node -o wide", desc: "list nodes with extra detail (IPs, etc.)", cat: "Inspect" },
  { cmd: "kubectl describe pod <name>", desc: "deep detail + an Events timeline — first stop when something breaks", cat: "Debug" },
  { cmd: "kubectl logs <pod>", desc: "view stdout/stderr of the first container", cat: "Debug" },
  { cmd: "kubectl logs <pod> -c <container>", desc: "logs for a specific container in a multi-container pod", cat: "Debug" },
  { cmd: "kubectl logs -f <pod>", desc: "stream logs live", cat: "Debug" },
  { cmd: "kubectl logs <pod> --since=10s", desc: "only recent logs", cat: "Debug" },
  { cmd: "kubectl exec -it <pod> -- sh", desc: "open an interactive shell inside a pod", cat: "Debug" },
  { cmd: "kubectl top nodes", desc: "resource usage per node (needs metrics-server)", cat: "Debug" },
  { cmd: "kubectl top pods -A", desc: "resource usage per pod", cat: "Debug" },
  { cmd: "kubectl apply -f file.yaml", desc: "create/update from a manifest — declarative", cat: "Apply" },
  { cmd: "kubectl create -f file.yaml", desc: "create from a manifest (errors if it already exists)", cat: "Apply" },
  { cmd: "kubectl delete -f file.yaml", desc: "delete everything defined in a manifest", cat: "Apply" },
  { cmd: "kubectl delete pod <name>", desc: "delete a single live object by name", cat: "Apply" },
  { cmd: "kubectl label pod <name> key=value", desc: "add a label", cat: "Apply" },
  { cmd: "kubectl label pod <name> key=value --overwrite", desc: "update an existing label", cat: "Apply" },
  { cmd: "kubectl label pod <name> key-", desc: "remove a label", cat: "Apply" },
  { cmd: "kubectl scale deployment <name> --replicas=3", desc: "change replica count", cat: "Workloads" },
  { cmd: "kubectl rollout status deployment/<name>", desc: "watch a rollout in progress", cat: "Workloads" },
  { cmd: "kubectl rollout history deployment <name>", desc: "view revision history", cat: "Workloads" },
  { cmd: "kubectl rollout undo deployment <name>", desc: "roll back to the previous revision", cat: "Workloads" },
  { cmd: "kubectl expose <object>", desc: "quickly create a Service for a pod/deployment", cat: "Networking" },
  { cmd: "kubectl port-forward <pod> <local>:<remote>", desc: "tunnel a local port to a pod's port", cat: "Networking" },
  { cmd: "kubectl cp <local> <pod>:<path>", desc: "copy files into/out of a pod", cat: "Misc" },
  { cmd: "kubectl config current-context", desc: "show which cluster kubectl is pointed at", cat: "Misc" },
  { cmd: "kubectl help", desc: "full command reference", cat: "Misc" },
];

/* ---- Hands-on tutorial modules (condensed from TUTORIAL.md) -------------*/

const TUTORIAL_MODULES = [
  {
    id: "m0",
    title: "Module 0 — Setup & Orientation",
    time: "10 min",
    why: "Kubernetes manages containers across a *cluster*. Minikube gives you a single-machine stand-in that behaves like a real cluster — every command learned here works unchanged against production later.",
    steps: [
      {
        text: "Install Podman and start its VM (Podman on macOS runs a small Linux VM on demand, called a **machine**):",
        code: "brew install podman\npodman machine init --cpus 2 --memory 2048 --disk-size 20\npodman machine start\npodman ps   # confirm it's alive",
      },
      {
        text: "Install Minikube (kubectl comes along with it):",
        code: "brew install minikube\nminikube version\nkubectl version --client",
      },
      {
        text: "Start the cluster. `--container-runtime=containerd` matters — Podman's other option (CRI-O) isn't available on macOS and produces a confusing `ImageInspectError`:",
        code: "minikube start --driver=podman --container-runtime=containerd",
      },
      {
        text: "Verify:",
        code: "minikube status\nkubectl get nodes",
      },
    ],
    checkpoint: "`minikube status` shows host/kubelet/apiserver all Running, and `kubectl get nodes` shows one node with STATUS Ready.",
  },
  {
    id: "m1",
    title: "Module 1 — Pods & the Declarative Model",
    time: "15 min",
    why: "A Pod is the smallest deployable thing. You'll rarely create a bare one in practice, but understanding it first is what makes Deployments click later instead of feeling like magic. This module also teaches **declarative vs. imperative**: `kubectl apply` makes the cluster match a file *once*, at that moment — it does not keep watching the file afterward.",
    steps: [
      {
        text: "Write `pod.yaml`:",
        code: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: hello-pod\n  labels:\n    app: hello\nspec:\n  containers:\n    - name: hello-container\n      image: nginx:alpine\n      ports:\n        - containerPort: 80",
      },
      {
        text: "Apply it, then inspect it:",
        code: "kubectl apply -f pod.yaml\nkubectl get pods\nkubectl describe pod hello-pod   # scroll to Events",
      },
      {
        text: "Prove it's really nginx (leave this running, curl from a second terminal):",
        code: "kubectl port-forward pod/hello-pod 8080:80\n# new tab:\ncurl localhost:8080",
      },
      {
        text: "The important part — kill it and watch. `kubectl delete pod` deletes the live object; it never touches `pod.yaml` on disk:",
        code: "kubectl delete pod hello-pod\nkubectl get pods   # \"No resources found\" — it does NOT come back",
      },
    ],
    note:
      "Nothing in the cluster is asking \"does hello-pod still exist?\" on a loop, so nothing notices when it disappears. A file on disk and an object in etcd are two separate things, linked only for the split second `apply` runs. Hold onto that gap — it's exactly the problem a Deployment's ReplicaSet solves next.",
    checkpoint: "You've seen `apply` / `get pods` / `describe pod` / `delete pod`, and confirmed a bare Pod does not self-heal.",
  },
  {
    id: "m2",
    title: "Module 2 — Deployments & Self-Healing",
    time: "15 min",
    why: "Real workloads need to survive a crashed container or deleted Pod without you manually re-applying. Deployment → creates/manages → ReplicaSet → creates/manages → Pod(s).",
    steps: [
      {
        text: "Write `deployment.yaml` — `spec.template` is a full Pod spec nested one level deeper, and `selector.matchLabels` must match `template.metadata.labels` exactly:",
        code: "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: hello-deploy\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: hello\n  template:\n    metadata:\n      labels:\n        app: hello\n    spec:\n      containers:\n        - name: hello-container\n          image: nginx:alpine\n          ports:\n            - containerPort: 80",
      },
      {
        text: "Apply and watch 3 pods appear (random suffixes mean \"created by a ReplicaSet\"):",
        code: "kubectl apply -f deployment.yaml\nkubectl get pods\nkubectl get all",
      },
      {
        text: "Prove self-healing — delete one pod by name and watch a replacement appear immediately, count staying at 3 the whole time:",
        code: "kubectl delete pod <paste-one-pod-name>\nkubectl get pods",
      },
      {
        text: "Scale up, then back down:",
        code: "kubectl scale deployment hello-deploy --replicas=5\nkubectl get pods\nkubectl scale deployment hello-deploy --replicas=3",
      },
    ],
    checkpoint: "3 pods Running with 0 restarts; you've watched a deleted pod get replaced automatically.",
  },
  {
    id: "m3",
    title: "Module 3 — Services & Networking",
    time: "15 min",
    why: "Every Pod gets its own IP, and Pods are disposable. A Service is a permanent address that automatically tracks whichever Pods currently match its label selector.",
    steps: [
      {
        text: "Expose the Deployment internally first (defaults to ClusterIP):",
        code: "kubectl expose deployment hello-deploy --port=80 --target-port=80 --name=hello-service\nkubectl get service hello-service",
      },
      {
        text: "Prove the Service survives pod churn — the CLUSTER-IP stays the same even after the pod behind it is replaced:",
        code: "POD_NAME=$(kubectl get pods -l app=hello -o jsonpath='{.items[0].metadata.name}')\nkubectl delete pod $POD_NAME\nkubectl get service hello-service",
      },
      {
        text: "Switch to NodePort so it's reachable from your laptop's browser:",
        code: "kubectl delete service hello-service\nkubectl expose deployment hello-deploy --port=80 --target-port=80 --type=NodePort --name=hello-service\nkubectl get service hello-service",
      },
      {
        text: "Load it (Minikube runs inside a VM, so `localhost` won't reach it):",
        code: "minikube service hello-service --url",
      },
    ],
    checkpoint: "Service TYPE is NodePort; nginx's welcome page loads via the Minikube URL, not port-forward.",
  },
  {
    id: "m4",
    title: "Module 4 — Config & Secrets",
    time: "15 min",
    why: "Containers should run unmodified across dev/staging/prod — only configuration and credentials should differ, injected at deploy time instead of baked into the image.",
    steps: [
      {
        text: "Create a ConfigMap and a Secret (Secrets are base64-encoded, not encrypted):",
        code: "kubectl create configmap hello-config --from-literal=GREETING=hello-from-configmap\nkubectl create secret generic hello-secret --from-literal=API_KEY=super-secret-value\nkubectl get secret hello-secret -o jsonpath='{.data.API_KEY}' | base64 -d",
      },
      {
        text: "Inject both into a Pod as environment variables — `configured-pod.yaml`:",
        code: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: configured-pod\nspec:\n  containers:\n    - name: hello-container\n      image: nginx:alpine\n      env:\n        - name: GREETING\n          valueFrom:\n            configMapKeyRef:\n              name: hello-config\n              key: GREETING\n        - name: API_KEY\n          valueFrom:\n            secretKeyRef:\n              name: hello-secret\n              key: API_KEY",
      },
      {
        text: "Apply and confirm the values arrived purely from cluster objects, never baked into the image:",
        code: "kubectl apply -f configured-pod.yaml\nkubectl exec configured-pod -- printenv GREETING API_KEY",
      },
    ],
    note:
      "If this goes wrong: the single most common mistake is a typo in `key:` (must match `--from-literal` exactly) or `name:` (must match the ConfigMap/Secret's own name). It shows up as `STATUS: CreateContainerConfigError` — run `kubectl describe pod configured-pod` and check Events for \"couldn't find key ... in ConfigMap ...\".",
    checkpoint: "`printenv GREETING API_KEY` prints both injected values correctly.",
  },
  {
    id: "m5",
    title: "Module 5 — Capstone: Web App + MongoDB",
    time: "25 min",
    why: "Real applications are systems. This combines every prior module into one two-tier deployment: Secret + ConfigMap feeding a MongoDB Deployment + Service, which a web app Deployment + Service connects to — applied in dependency order.",
    steps: [
      {
        text: "1. MongoDB credentials — encode a username/password, paste into `mongo-secret.yaml`:",
        code: "echo -n 'admin' | base64\necho -n 'changeme123' | base64",
      },
      {
        text: "2. MongoDB Deployment + internal (ClusterIP) Service — `mongo.yaml`:",
        code: "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: mongo-deploy\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: mongo\n  template:\n    metadata:\n      labels:\n        app: mongo\n    spec:\n      containers:\n        - name: mongo\n          image: mongo:6\n          ports:\n            - containerPort: 27017\n          env:\n            - name: MONGO_INITDB_ROOT_USERNAME\n              valueFrom:\n                secretKeyRef: { name: mongo-secret, key: mongo-user }\n            - name: MONGO_INITDB_ROOT_PASSWORD\n              valueFrom:\n                secretKeyRef: { name: mongo-secret, key: mongo-password }\n---\napiVersion: v1\nkind: Service\nmetadata:\n  name: mongo-service\nspec:\n  selector:\n    app: mongo\n  ports:\n    - port: 27017\n      targetPort: 27017",
      },
      {
        text: "3. Web app config — points at `mongo-service`, which resolves via Kubernetes' built-in Service DNS:",
        code: "apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: webapp-config\ndata:\n  MONGO_URL: \"mongodb://admin:changeme123@mongo-service:27017\"",
      },
      {
        text: "4. Web app Deployment + external (NodePort) Service, then deploy everything in dependency order:",
        code: "kubectl apply -f mongo-secret.yaml\nkubectl apply -f mongo.yaml\nkubectl apply -f webapp-config.yaml\nkubectl apply -f webapp.yaml\nkubectl get all",
      },
    ],
    note:
      "If this goes wrong: web app stuck in CreateContainerConfigError → check the ConfigMap `key:` matches exactly. Mongo env printing blank → check the Secret's base64 was pasted correctly (`echo -n` matters — a trailing newline breaks it). Everything Running but app can't reach Mongo → confirm `mongo-service` existed *before* the web app pods started; re-apply `webapp.yaml` if order was wrong.",
    checkpoint: "`kubectl get all` shows 3 pods total (1 mongo + 2 webapp) Running with 0 restarts; `kubectl exec deploy/webapp-deploy -- printenv MONGO_URL` prints the full connection string.",
  },
  {
    id: "m6",
    title: "Module 6 — Cleanup & Where to Go Next",
    time: "5 min",
    why: "Tear down what you built, or stop the cluster to resume quickly next time.",
    steps: [
      {
        text: "Remove just the capstone's resources, keeping the cluster running:",
        code: "kubectl delete -f webapp.yaml -f webapp-config.yaml -f mongo.yaml -f mongo-secret.yaml",
      },
      {
        text: "Stop the cluster (fast to resume) vs. delete it entirely (rebuilds from scratch next time):",
        code: "minikube stop      # keeps it on disk\nminikube delete    # full teardown",
      },
    ],
    checkpoint:
      "You now know: Pods and why they're never used bare in practice; Deployments/ReplicaSets/self-healing/scaling; Services and ClusterIP vs. NodePort; ConfigMaps/Secrets; deploying a multi-component system in dependency order.",
  },
];

/* ---- Architecture request-flow steps (for the Architecture section) -----*/

const REQUEST_FLOW_STEPS = [
  "You run a `kubectl` command → sent to the **API Server**.",
  "API Server validates it (auth + admission checks), saves the plan to **etcd**.",
  "API Server asks the **Scheduler** which node to use (unless one is already specified).",
  "Scheduler picks a node based on available resources → API Server records that decision in etcd.",
  "API Server tells the **kubelet** on the chosen node to build it.",
  "kubelet issues container-runtime commands (`docker run`-style) → the Pod and its container(s) start.",
  "kubelet continuously reports status back to the API Server, which writes it to etcd.",
];

/* ---- Troubleshooting quick-reference --------------------------------- */

const TROUBLESHOOTING = [
  {
    symptom: "Pod stuck in `CreateContainerConfigError`",
    cause: "A `key:` in `configMapKeyRef` / `secretKeyRef` doesn't exactly match the key inside the ConfigMap/Secret, or `name:` doesn't match the object's own name.",
    fix: "`kubectl describe pod <name>` → Events will say something like \"couldn't find key GREETING in ConfigMap default/hello-config\". Fix the typo and re-apply.",
  },
  {
    symptom: "`READY 0/1` and it never moves",
    cause: "Container hasn't started yet, or it crashed immediately after starting.",
    fix: "`kubectl describe pod <name>` (check Events) then `kubectl logs <name>` for the real error.",
  },
  {
    symptom: "RESTARTS count keeps climbing",
    cause: "The container is crash-looping — it starts, fails, and gets restarted repeatedly.",
    fix: "`kubectl logs <name>` (add `--previous` to see the crashed instance's logs, not the new one).",
  },
  {
    symptom: "Minikube: `ImageInspectError` when starting the cluster on macOS",
    cause: "Podman's CRI-O runtime option isn't available on macOS, and it was picked implicitly.",
    fix: "Always start with `--container-runtime=containerd` when using `--driver=podman`.",
  },
  {
    symptom: "`localhost:<port>` doesn't load a NodePort service",
    cause: "Minikube runs inside its own VM — `localhost` on your host machine doesn't reach it.",
    fix: "Use `minikube service <name> --url`, or `minikube ip` plus the NodePort shown in `kubectl get service`.",
  },
  {
    symptom: "Deleted a Pod and it never comes back",
    cause: "It's a bare Pod with no controller (Deployment/ReplicaSet) managing it — nothing is watching for it to disappear.",
    fix: "Re-run `kubectl apply -f pod.yaml` by hand, or (better) wrap it in a Deployment so a ReplicaSet keeps it alive automatically.",
  },
  {
    symptom: "Deployment's pods aren't appearing / Service finds no endpoints",
    cause: "`selector.matchLabels` (Deployment) or `spec.selector` (Service) doesn't exactly match the Pod template's labels.",
    fix: "`kubectl get pods --show-labels` and compare byte-for-byte against the selector in the Deployment/Service YAML.",
  },
  {
    symptom: "ConfigMap volume mount wiped an existing directory",
    cause: "Mounting a ConfigMap/Secret volume onto a non-empty directory (e.g. `/etc/nginx`) replaces its entire contents.",
    fix: "Use `subPath` to add a single file without clobbering the rest of the directory.",
  },
  {
    symptom: "App can't reach the database even though everything shows `Running`",
    cause: "Manifests were applied out of dependency order — the app's pods started before the database Service existed / was resolvable.",
    fix: "Confirm the DB Service exists first (`kubectl get service`), then delete and re-apply the app's manifest so it re-resolves DNS on startup.",
  },
];

const OBJECT_RELATIONSHIP_MAP = `Namespace
 ├── ResourceQuota (caps total resource use)
 ├── Deployment
 │     └── ReplicaSet
 │           └── Pod(s)
 │                 ├── Container(s)
 │                 │     ├── resources.requests / limits
 │                 │     ├── livenessProbe / readinessProbe
 │                 │     └── volumeMounts
 │                 └── volumes → ConfigMap / Secret / PersistentVolumeClaim
 ├── Service (ClusterIP / NodePort / LoadBalancer) → selects Pods by label
 └── NetworkPolicy → controls ingress/egress between Pods by label`;
