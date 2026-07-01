import type { DriveStep } from "driver.js"

export interface TourDefinition {
  id: string
  title: string
  description: string
  /** 需要跳转到的路径（用于不在当前页面时自动导航） */
  navigateTo?: string | ((adminPath: string) => string)
  /** 匹配的路由路径，判断当前页面是否可直接启动 */
  pathPattern: string | ((path: string) => boolean)
  steps: DriveStep[]
}

function closeOpenDialogs() {
  document.querySelector<HTMLElement>("[role='dialog']:not(.driver-popover) button[aria-label]")?.click()
}

function openDialogStep(
  triggerSelector: string,
  step: Omit<DriveStep, "onHighlightStarted"> & { popover: NonNullable<DriveStep["popover"]> },
): DriveStep {
  return {
    ...step,
    onHighlightStarted: () => {
      if (!document.querySelector(step.element as string)) {
        document.querySelector<HTMLElement>(triggerSelector)?.click()
      }
    },
    onDeselected: () => {
      const nextTarget = document.querySelector("[data-tour].driver-active-element")
      const isInsideDialog = nextTarget?.closest("[role='dialog']")
      if (!isInsideDialog) closeOpenDialogs()
    },
  }
}

function lastDialogStep(
  step: Omit<DriveStep, "onDeselected"> & { popover: NonNullable<DriveStep["popover"]> },
): DriveStep {
  return {
    ...step,
    onDeselected: () => closeOpenDialogs(),
  }
}

export function buildAdminTours(adminPath: string): TourDefinition[] {
  return [
    {
      id: "admin-dashboard",
      title: "认识仪表盘",
      description: "管理后台整体布局和关键数据区域",
      navigateTo: (ap) => ap,
      pathPattern: (path) => path === adminPath || path === `${adminPath}/`,
      steps: [
        {
          popover: {
            title: "欢迎使用管理后台",
            description:
              "这是管理后台的仪表盘，汇总了系统核心数据。接下来带你快速认识各个区域。",
          },
        },
        {
          element: "[data-tour='sidebar']",
          popover: {
            title: "侧边栏导航",
            description:
              "所有管理功能都在这里，分为资源管理、业务管理和系统三大类。左上角按钮可以折叠侧边栏。",
          },
        },
        {
          element: "[data-tour='header-toolbar']",
          popover: {
            title: "顶部工具栏",
            description:
              "从左到右依次是：新手教程（当前）、后台任务进度、前台门户入口、系统设置和主题切换。",
          },
        },
        {
          element: "[data-tour='setup-guide']",
          popover: {
            title: "快速开始引导",
            description:
              "首次使用时，按清单完成初始配置：添加节点 → 导入镜像 → 创建套餐 → 配置支付，全部完成后即可开始售卖。",
          },
        },
        {
          element: "[data-tour='stat-cards']",
          popover: {
            title: "统计概览",
            description:
              "节点数量、实例数、用户数和本月收入一目了然，点击卡片可跳转到对应管理页面。",
          },
        },
        {
          element: "[data-tour='revenue-trend']",
          popover: {
            title: "收入趋势",
            description: "近 30 天的每日收入折线图，帮助你掌握业务走势。",
          },
        },
        {
          element: "[data-tour='pending-items']",
          popover: {
            title: "待处理事项",
            description:
              "待支付订单、待处理工单、异常实例和节点的提醒，点击可直接跳转处理。",
          },
        },
      ],
    },
    {
      id: "admin-nodes",
      title: "节点管理",
      description: "节点是运行实例的物理服务器，了解如何添加和管理",
      navigateTo: (ap) => `${ap}/nodes`,
      pathPattern: (path) => path.includes("/nodes"),
      steps: [
        {
          popover: {
            title: "什么是节点？",
            description:
              "节点就是你的物理服务器（宿主机）。所有云服务器实例都运行在节点上。系统通过 SSH 连接节点完成自动化管理。",
          },
        },
        {
          element: "[data-tour='node-description']",
          popover: {
            title: "节点工作流程",
            description:
              "完整流程：① 添加节点（填写 SSH 连接信息）→ ② 点击「初始化」自动安装运行环境 → ③ 将节点加入节点组 → ④ 套餐关联节点组后即可售卖。",
          },
        },
        {
          element: "[data-tour='node-tabs']",
          popover: {
            title: "节点列表 vs 节点组",
            description:
              "「节点列表」管理单个服务器；「节点组」把多个节点归组，用于高可用和负载均衡。套餐通过选择可用节点来决定在哪些服务器上创建实例。",
          },
        },
        {
          element: "[data-tour='node-add-btn']",
          popover: {
            title: "添加节点",
            description:
              "点击「下一步」将打开添加节点表单，带你了解每个字段的含义。",
            onNextClick: (_el, _step, { driver: d }) => {
              document.querySelector<HTMLElement>("[data-tour='node-add-btn']")?.click()
              setTimeout(() => d.moveNext(), 300)
            },
          },
        },
        openDialogStep("[data-tour='node-add-btn']", {
          element: "[data-tour='node-form-basic']",
          popover: {
            title: "名称和区域",
            description:
              "「名称」用于标识这台服务器，建议用地区+编号的格式（如 hk-node-01）。「区域」是展示给用户的地域标签（如 hk、us），会显示在用户选购页面。",
          },
        }),
        openDialogStep("[data-tour='node-add-btn']", {
          element: "[data-tour='node-form-host']",
          popover: {
            title: "主机地址",
            description:
              "填写服务器的公网 IP 或域名（如 192.168.1.100）。系统通过这个地址连接和管理服务器。",
          },
        }),
        openDialogStep("[data-tour='node-add-btn']", {
          element: "[data-tour='node-form-ports']",
          popover: {
            title: "端口配置",
            description:
              "「服务端口」默认 8443，是运行环境的 API 端口，一般无需修改。<br>「SSH 端口」默认 22，初始化时通过 SSH 连接服务器安装环境。",
          },
        }),
        lastDialogStep({
          element: "[data-tour='node-form-ssh']",
          popover: {
            title: "SSH 认证",
            description:
              "选择密码或私钥认证方式。初始化节点时，系统通过 SSH 连接到服务器自动安装运行环境。<br><br>建议使用 root 用户 + 私钥认证，安全性更高。",
          },
        }),
        {
          element: "[data-tour='node-table']",
          popover: {
            title: "节点列表",
            description:
              "显示所有节点的状态和资源。<br>🟢 就绪 = 正常运行<br>🔵 部署中 = 初始化进行中<br>🟠 维护 = 暂停接新实例<br>🔴 异常/离线 = 需要排查",
          },
        },
        {
          element: "[data-tour='node-actions']",
          popover: {
            title: "节点操作",
            description:
              "🚀 初始化：首次添加或重新配置时使用<br>✏️ 编辑：修改连接信息<br>⋯ 更多：维护模式、手动疏散、删除",
          },
        },
        {
          popover: {
            title: "下一步",
            description:
              "节点添加并初始化后，可以在「节点组」标签页创建节点组实现高可用。然后在套餐中选择可用节点即可开始售卖。",
          },
        },
      ],
    },
    {
      id: "admin-instances",
      title: "实例管理",
      description: "查看和管理所有云服务器实例",
      navigateTo: (ap) => `${ap}/instances`,
      pathPattern: (path) => path.includes("/instances") && !path.includes("/create"),
      steps: [
        {
          popover: {
            title: "实例管理",
            description:
              "这里展示系统中所有云服务器实例。实例通常由用户下单自动创建，管理员也可以手动创建（用于测试或赠送）。",
          },
        },
        {
          element: "[data-tour='instance-create-btn']",
          popover: {
            title: "手动创建实例",
            description:
              "管理员直接创建实例，跳过订单流程。需要选择节点、IP、镜像，设置 CPU/内存/磁盘等配置。适用于测试或特殊需求。",
          },
        },
        {
          element: "[data-tour='instance-table']",
          popover: {
            title: "实例列表",
            description:
              "显示实例的名称、所在节点、类型（虚拟机/容器）、状态、配置、IP 等信息。支持按状态筛选和搜索。",
          },
        },
        {
          popover: {
            title: "实例详情",
            description:
              "点击实例名称进入详情页，可以查看和管理：概览信息、配置（CPU/磁盘/网络设备）、防火墙规则、端口转发、快照备份、SSH 终端、VNC 控制台。",
          },
        },
        {
          popover: {
            title: "实例状态说明",
            description:
              "创建中 → 运行中 → 已停止（可启动/重启）。特殊状态：冻结 = 到期或被管理员暂停；异常 = 需要排查。实例到期后进入冻结状态，超过宽限期自动删除。",
          },
        },
      ],
    },
    {
      id: "admin-create-instance",
      title: "创建实例表单",
      description: "了解手动创建实例的各项配置",
      navigateTo: (ap) => `${ap}/instances/create`,
      pathPattern: (path) => path.includes("/instances/create"),
      steps: [
        {
          popover: {
            title: "创建实例表单",
            description:
              "管理员可以在这里手动创建实例（跳过订单流程）。页面分为左侧导航 + 右侧配置区域，接下来带你了解各个配置项。",
          },
        },
        {
          element: "[data-tour='create-instance-nav']",
          popover: {
            title: "左侧导航",
            description:
              "左侧列出了所有配置分类：<br>• <b>基本信息</b>：节点、IP、名称、镜像等必填项<br>• <b>设备</b>：磁盘、网络、GPU 等硬件配置<br>• <b>其他</b>：资源限制、安全策略、Cloud-Init 等高级选项<br><br>大多数情况只需填写「基本信息」即可创建。",
          },
        },
        {
          element: "[data-tour='create-instance-node']",
          popover: {
            title: "选择节点",
            description:
              "选择实例将运行在哪台宿主机上。下拉列表只显示已上线的节点。<br>选择节点后，下方的 IP 选择器会自动加载该节点可用的 IP 地址。",
          },
        },
        {
          element: "[data-tour='create-instance-type']",
          popover: {
            title: "实例类型",
            description:
              "「虚拟机」完全隔离、支持 Windows，性能略低；<br>「容器」共享内核、仅 Linux，启动更快性能更高。<br><br>大多数 VPS 场景选择虚拟机。",
          },
        },
        {
          element: "[data-tour='create-instance-image']",
          popover: {
            title: "系统镜像",
            description:
              "选择操作系统镜像。这里会显示已导入系统并分发到所选节点的镜像。<br>如果列表为空，请先到「镜像管理」页面导入镜像并分发到对应节点。",
          },
        },
        {
          popover: {
            title: "设备配置（高级）",
            description:
              "左侧导航的「设备」分组包含磁盘、附加卷、网络、GPU 等配置。<br><br>对于常规创建，系统会根据选择的镜像自动配置默认磁盘和网络，无需手动调整。只有特殊场景（如挂载额外磁盘、添加 GPU 直通）才需要修改。",
          },
        },
        {
          popover: {
            title: "Cloud-Init（高级）",
            description:
              "在左侧导航的「Cloud Init」中可以编写启动脚本，实例首次启动时自动执行。<br>常见用途：安装软件包、配置防火墙、设置时区等。留空则不执行任何脚本。",
          },
        },
      ],
    },
    {
      id: "admin-plans",
      title: "套餐管理",
      description: "创建和管理定价套餐，理解套餐与节点的关系",
      navigateTo: (ap) => `${ap}/plans`,
      pathPattern: (path) => path.includes("/plans"),
      steps: [
        {
          popover: {
            title: "什么是套餐？",
            description:
              "套餐定义了云服务器的配置和价格：CPU、内存、磁盘、带宽、流量以及各周期的价格。用户通过选购套餐来开通云服务器。",
          },
        },
        {
          element: "[data-tour='plan-table']",
          popover: {
            title: "套餐列表",
            description:
              "显示所有套餐的配置概要和月付价格。<br>「上架」状态的套餐对用户可见，「下架」状态仅管理员可见。<br><br>点击「下一步」将打开创建表单，带你了解各个配置区域。",
            onNextClick: (_el, _step, { driver: d }) => {
              document.querySelector<HTMLElement>("[data-tour='plan-add-btn']")?.click()
              setTimeout(() => d.moveNext(), 400)
            },
          },
        },
        openDialogStep("[data-tour='plan-add-btn']", {
          element: "[data-tour='plan-form-basic']",
          popover: {
            title: "① 基础信息",
            description:
              "填写套餐名称（如「基础型 1核1G」）和描述。<br>分组用于前台分类展示，方便用户筛选。",
          },
        }),
        openDialogStep("[data-tour='plan-add-btn']", {
          element: "[data-tour='plan-form-resource']",
          popover: {
            title: "② 资源配置",
            description:
              "设置 CPU、内存、磁盘等核心参数。<br>「NAT 模式」开关决定网络方式：关闭 = 每台实例独立 IP；开启 = 多台共享 IP + 端口映射。<br>带宽/流量设为 0 表示不限制。",
          },
        }),
        openDialogStep("[data-tour='plan-add-btn']", {
          element: "[data-tour='plan-form-price']",
          popover: {
            title: "③ 定价",
            description:
              "价格单位是「分」（如 2000 = ¥20.00）。<br>支持按小时/月/季/年四种周期，设为 0 则该周期不可选。<br>附加 IP 价格设为 0 则不支持用户额外购买 IP。",
          },
        }),
        lastDialogStep({
          element: "[data-tour='plan-form-sales']",
          popover: {
            title: "④ 销售设置",
            description:
              "库存 -1 表示不限量。<br>「可用节点」限定实例可创建在哪些服务器上，不选则全部可用。<br>「可用镜像」限定用户可选的系统，不选则全部可用。<br>确保选的镜像已分发到选的节点上，否则用户下单会失败。",
          },
        }),
        {
          popover: {
            title: "关键提醒",
            description:
              "套餐关联的可用镜像必须已分发到对应的可用节点上，否则用户下单时会因为找不到资源而失败。建议创建套餐后以用户视角走一遍购买流程确认正常。",
          },
        },
      ],
    },
    {
      id: "admin-images",
      title: "镜像管理",
      description: "导入操作系统镜像并分发到节点",
      navigateTo: (ap) => `${ap}/images`,
      pathPattern: (path) => path.includes("/images"),
      steps: [
        {
          popover: {
            title: "镜像管理",
            description:
              "镜像是创建云服务器时使用的操作系统模板。系统支持三种导入方式：从镜像库选择、远程 URL 下载、直接上传文件。",
          },
        },
        {
          element: "[data-tour='image-table']",
          popover: {
            title: "镜像列表",
            description:
              "显示所有镜像及其状态。注意「来源」列：镜像库/远程下载/上传/本地。下载状态图标表示文件是否就绪。",
          },
        },
        {
          popover: {
            title: "⚠️ 分发是关键步骤",
            description:
              "导入镜像 ≠ 可用！镜像文件导入后，还需要点击「分发」按钮将其推送到具体的节点上。只有节点上有该镜像，创建实例时才能使用。",
          },
        },
        {
          popover: {
            title: "镜像与套餐的关系",
            description:
              "套餐需要关联可用镜像，用户下单时从关联的镜像中选择。确保套餐关联的镜像已分发到套餐可用节点上。",
          },
        },
      ],
    },
    {
      id: "admin-ips",
      title: "IP 池管理",
      description: "管理 IP 地址资源池",
      navigateTo: (ap) => `${ap}/ips`,
      pathPattern: (path) => path.includes("/ips") && !path.includes("/shared-ips"),
      steps: [
        {
          popover: {
            title: "IP 池管理",
            description:
              "IP 池是一组可分配给云服务器的 IP 地址段。创建实例时，系统自动从 IP 池中分配空闲 IP。",
          },
        },
        {
          element: "[data-tour='ip-table']",
          popover: {
            title: "IP 池列表",
            description:
              "显示每个 IP 池的 CIDR 段、网关、已用/总数/空闲 IP 数。当空闲 IP 为 0 时，即使套餐有库存也无法创建新实例。",
          },
        },
        {
          popover: {
            title: "创建 IP 池",
            description:
              "需要填写：名称、类型（IPv4/IPv6）、CIDR（如 192.168.1.0/24）、网关（如 192.168.1.1）、DNS。可选填 VLAN ID 和网桥名称（高级网络场景）。",
          },
        },
        {
          popover: {
            title: "批量生成 IP",
            description:
              "创建 IP 池后，点击闪电图标可以批量生成 IP 地址。输入起始和结束 IP，系统会自动生成范围内的所有地址添加到池中。",
          },
        },
      ],
    },
    {
      id: "admin-orders",
      title: "订单管理",
      description: "查看订单、处理支付和退款",
      navigateTo: (ap) => `${ap}/orders`,
      pathPattern: (path) => path.includes("/orders"),
      steps: [
        {
          popover: {
            title: "订单管理",
            description:
              "所有用户下单记录都在这里，包括新购、续费、升级、附加 IP 和流量包订单。",
          },
        },
        {
          element: "[data-tour='order-tabs']",
          popover: {
            title: "订单 vs 交易流水",
            description:
              "「订单列表」展示业务订单（新购/续费等）；「交易流水」记录资金变动（支付/退款/充值/佣金等），两者互相关联。",
          },
        },
        {
          element: "[data-tour='order-table']",
          popover: {
            title: "订单列表",
            description:
              "显示订单号、用户、类型、金额、状态和时间。支持按状态筛选（待支付/已支付/已取消/已退款）。",
          },
        },
        {
          popover: {
            title: "订单操作",
            description:
              "管理员可以：手动标记支付（跳过支付网关）、取消未支付订单、对已支付订单发起退款。退款会自动扣除关联的代理佣金。",
          },
        },
      ],
    },
    {
      id: "admin-shared-ips",
      title: "共享 IP（NAT）",
      description: "理解 NAT 模式下的共享 IP 和端口分配",
      navigateTo: (ap) => `${ap}/shared-ips`,
      pathPattern: (path) => path.includes("/shared-ips"),
      steps: [
        {
          popover: {
            title: "什么是共享 IP？",
            description:
              "共享 IP 即 NAT 模式：多台实例共用一个公网 IP，通过不同端口映射来访问各实例。适合低成本 VPS 场景，大幅节省 IP 资源。",
          },
        },
        {
          element: "[data-tour='shared-ip-table']",
          popover: {
            title: "共享 IP 列表",
            description:
              "每条共享 IP 绑定到一个节点，显示公网 IP、端口范围、已使用端口数。端口范围决定了该 IP 最多能承载多少实例。",
          },
        },
        {
          popover: {
            title: "工作原理",
            description:
              "创建共享 IP 时指定端口范围（如 10000-60000）和每实例分配端口数。系统自动为每台实例分配一段连续端口，其中固定一个端口映射 SSH（通常是段内第一个端口）。",
          },
        },
        {
          popover: {
            title: "与套餐的关系",
            description:
              "套餐开启 NAT 模式后，创建实例时不再分配独立 IP，而是从该节点的共享 IP 中分配端口段。确保目标节点已配置共享 IP 且端口未耗尽。",
          },
        },
      ],
    },
    {
      id: "admin-settings",
      title: "系统设置导览",
      description: "了解各设置分组的用途",
      navigateTo: (ap) => `${ap}/settings`,
      pathPattern: (path) => path.includes("/settings"),
      steps: [
        {
          popover: {
            title: "系统设置",
            description:
              "系统所有全局配置都在这里，按功能分为 5 大分组，共 26 个设置项。",
          },
        },
        {
          element: "[data-tour='settings-basic']",
          popover: {
            title: "基础设置",
            description:
              "站点信息（名称/Logo/URL）、首页内容编辑、货币与本地化、服务条款、维护模式。其中「站点信息」的 URL 必须与授权域名一致。",
          },
        },
        {
          element: "[data-tour='settings-notify']",
          popover: {
            title: "通知与消息",
            description:
              "邮件通知（SMTP）、邮件模板定制、短信验证码、Telegram/钉钉/企业微信等通知渠道、告警配置和工单设置。",
          },
        },
        {
          element: "[data-tour='settings-finance']",
          popover: {
            title: "财务与支付",
            description:
              "配置支付渠道（支付宝/微信/Stripe 等）和代理分销系统。至少启用一个支付渠道才能让用户完成付款。",
          },
        },
        {
          element: "[data-tour='settings-security']",
          popover: {
            title: "安全与用户",
            description:
              "登录安全策略、人机验证、用户注册方式、第三方社交登录和实名认证。建议上线前配置好注册和安全策略。",
          },
        },
        {
          element: "[data-tour='settings-ops']",
          popover: {
            title: "实例与运维",
            description:
              "实例创建规则（主机名/密码生成）、到期生命周期策略、自动备份、对象存储、救援模式和反向 DNS。",
          },
        },
      ],
    },
  ]
}

export const portalTours: TourDefinition[] = [
  {
    id: "portal-dashboard",
    title: "认识控制台",
    description: "用户控制台的布局和功能入口",
    navigateTo: "/portal",
    pathPattern: (path) => path === "/portal" || path === "/portal/",
    steps: [
      {
        popover: {
          title: "欢迎来到控制台",
          description:
            "这是你的云服务控制台，管理云服务器、查看订单、提交工单等操作都从这里开始。",
        },
      },
      {
        element: "[data-tour='portal-nav']",
        popover: {
          title: "导航菜单",
          description:
            "顶部导航可以快速切换到云服务器、私有网络、费用订单和工单页面。",
        },
      },
      {
        element: "[data-tour='portal-actions']",
        popover: {
          title: "快捷操作",
          description:
            "「创建云服务器」直接进入选购流程，「充值」可以为账户添加余额。",
        },
      },
      {
        element: "[data-tour='portal-stats']",
        popover: {
          title: "资源概览",
          description:
            "一眼看到你拥有的云服务器数量、待处理订单、工单状态和账户余额。点击任意卡片可跳转详情。",
        },
      },
      {
        element: "[data-tour='portal-services']",
        popover: {
          title: "产品与服务",
          description:
            "这里展示了可用的服务入口，包括云服务器选购、费用中心和工单支持。",
        },
      },
      {
        element: "[data-tour='portal-user-menu']",
        popover: {
          title: "用户菜单",
          description:
            "点击头像可以管理个人资料、查看钱包，以及随时进入新手教程。管理员还能看到「管理后台」入口。",
        },
      },
    ],
  },
  {
    id: "portal-purchase",
    title: "选购云服务器",
    description: "了解选购流程的每个步骤",
    navigateTo: "/portal/purchase",
    pathPattern: (path) => path.includes("/portal/purchase"),
    steps: [
      {
        popover: {
          title: "选购流程",
          description:
            "选购云服务器只需 4 步：选择套餐 → 选择节点和镜像 → 设置主机名和密码 → 确认下单。",
        },
      },
      {
        element: "[data-tour='purchase-plans']",
        popover: {
          title: "① 选择套餐",
          description:
            "每个套餐卡片展示 CPU、内存、磁盘和价格。点击选中后，下方会自动显示该套餐可用的节点和镜像。",
        },
      },
      {
        element: "[data-tour='purchase-cycle']",
        popover: {
          title: "② 计费周期",
          description:
            "选择按小时、月付、季付或年付。不同周期价格不同，长周期通常更优惠。按小时计费只在运行时扣费，停止不收费。",
        },
      },
      {
        element: "[data-tour='purchase-config']",
        popover: {
          title: "③ 基本配置",
          description:
            "设置主机名和 root 密码（已自动生成，可修改）。如果配置了 SSH 密钥，还可以选择密钥登录。",
        },
      },
      {
        element: "[data-tour='purchase-submit']",
        popover: {
          title: "④ 确认下单",
          description:
            "检查配置和价格无误后点击「立即下单」。订单创建后跳转到支付页面，支付成功后系统自动创建云服务器。",
        },
      },
    ],
  },
  {
    id: "portal-instances",
    title: "管理云服务器",
    description: "查看和操作云服务器",
    navigateTo: "/portal/servers",
    pathPattern: (path) => path === "/portal/servers" || path === "/portal/servers/",
    steps: [
      {
        popover: {
          title: "云服务器列表",
          description: "这里展示了你所有的云服务器，以卡片形式排列。",
        },
      },
      {
        element: "[data-tour='instance-search']",
        popover: {
          title: "搜索服务器",
          description: "输入名称或 IP 地址快速查找目标服务器。",
        },
      },
      {
        element: "[data-tour='instance-card']",
        popover: {
          title: "服务器卡片",
          description:
            "每张卡片展示服务器的名称、状态、IP、配置和到期时间。点击卡片可查看详细信息。",
        },
      },
      {
        element: "[data-tour='instance-actions']",
        popover: {
          title: "操作按钮",
          description:
            "鼠标悬停卡片底部会出现操作按钮：启动/停止/重启。右侧菜单可以进入详情、打开终端或管理快照。",
        },
      },
    ],
  },
  {
    id: "portal-instance-detail",
    title: "实例详情",
    description: "了解实例详情页的各项功能",
    pathPattern: (path) => /^\/portal\/servers\/\d+/.test(path),
    steps: [
      {
        element: "[data-tour='instance-info']",
        popover: {
          title: "基本信息",
          description:
            "查看服务器的 IP、配置、操作系统、计费周期和到期时间等核心信息。",
        },
      },
      {
        element: "[data-tour='instance-power']",
        popover: {
          title: "电源控制",
          description:
            "启动、停止、重启你的服务器。虚拟机还支持救援模式（从救援盘启动修复系统）。",
        },
      },
      {
        element: "[data-tour='instance-tabs']",
        popover: {
          title: "功能标签页",
          description:
            "切换不同功能：「监控」查看 CPU/内存/网络数据，「防火墙」配置安全规则，「快照」管理备份，「终端」打开 SSH，「控制台」使用 VNC 远程桌面。",
        },
      },
    ],
  },
]
