const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// In-Memory Data Store Collections (Fallback when local MongoDB is not running)
const memoryStore = {
  users: [],
  organizations: [],
  workspaces: [],
  projects: [],
  tasks: [],
  memberships: [],
};

const generateId = () => {
  return crypto.randomBytes(8).toString('hex');
};

const wrapDocument = (item, collectionName) => {
  if (!item) return item;
  item.save = async function () {
    const idx = memoryStore[collectionName].findIndex((x) => x._id.toString() === this._id.toString());
    if (idx >= 0) memoryStore[collectionName][idx] = this;
    return this;
  };
  item.toObject = function () {
    return { ...this };
  };
  return item;
};

// Seed initial synthetic data directly into memory store
const initMemoryStore = async () => {
  if (memoryStore.users.length > 0) return;

  const orgId = generateId();
  const workspaceId = generateId();
  const ownerId = generateId();
  const managerId = generateId();
  const employeeId = generateId();

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  const org = wrapDocument({
    _id: orgId,
    name: 'Apex Innovations Corp',
    slug: 'apex-innovations',
    subscriptionTier: 'enterprise',
    owner: ownerId,
    createdAt: new Date(),
  }, 'organizations');
  memoryStore.organizations.push(org);

  const workspace = wrapDocument({
    _id: workspaceId,
    name: 'Product & Engineering Workspace',
    organization: orgId,
    description: 'Central engineering workspace for core platform deliverables',
    createdAt: new Date(),
  }, 'workspaces');
  memoryStore.workspaces.push(workspace);

  const owner = wrapDocument({
    _id: ownerId,
    name: 'Alex Vance (Owner)',
    email: 'owner@apex.com',
    password: passwordHash,
    role: 'owner',
    organization: org,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    createdAt: new Date(),
    matchPassword: async function (entered) {
      return await bcrypt.compare(entered, this.password);
    },
  }, 'users');

  const manager = wrapDocument({
    _id: managerId,
    name: 'Sarah Connor (Manager)',
    email: 'manager@apex.com',
    password: passwordHash,
    role: 'manager',
    organization: org,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    createdAt: new Date(),
    matchPassword: async function (entered) {
      return await bcrypt.compare(entered, this.password);
    },
  }, 'users');

  const employee = wrapDocument({
    _id: employeeId,
    name: 'David Kim (Employee)',
    email: 'dev@apex.com',
    password: passwordHash,
    role: 'employee',
    organization: org,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    createdAt: new Date(),
    matchPassword: async function (entered) {
      return await bcrypt.compare(entered, this.password);
    },
  }, 'users');

  memoryStore.users.push(owner, manager, employee);

  const project1Id = generateId();
  const project2Id = generateId();

  const project1 = wrapDocument({
    _id: project1Id,
    name: 'SaaS Platform v2.0',
    key: 'SAAS',
    description: 'Next-generation team collaboration portal with Kanban board and multi-tenant isolation.',
    status: 'active',
    organization: orgId,
    workspace: workspaceId,
    owner: { _id: ownerId, name: owner.name, email: owner.email },
    members: [
      { _id: ownerId, name: owner.name, email: owner.email },
      { _id: managerId, name: manager.name, email: manager.email },
      { _id: employeeId, name: employee.name, email: employee.email },
    ],
    startDate: new Date(),
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  }, 'projects');

  const project2 = wrapDocument({
    _id: project2Id,
    name: 'Mobile Client Experience',
    key: 'MOB',
    description: 'Responsive mobile web application and offline sync features.',
    status: 'active',
    organization: orgId,
    workspace: workspaceId,
    owner: { _id: managerId, name: manager.name, email: manager.email },
    members: [
      { _id: managerId, name: manager.name, email: manager.email },
      { _id: employeeId, name: employee.name, email: employee.email },
    ],
    startDate: new Date(),
    dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  }, 'projects');

  memoryStore.projects.push(project1, project2);

  const task1Id = generateId();
  const task2Id = generateId();
  const task3Id = generateId();
  const task4Id = generateId();

  const rawTasks = [
    {
      _id: task1Id,
      title: 'Design Multi-Tenant Architecture & Wireframes',
      description: 'Prepare high-level component hierarchy, ER diagram, and authenticated app shell layout.',
      project: { _id: project1Id, name: project1.name, key: project1.key },
      workspace: workspaceId,
      organization: orgId,
      creator: { _id: ownerId, name: owner.name, email: owner.email },
      assignee: { _id: ownerId, name: owner.name, email: owner.email },
      status: 'done',
      priority: 'high',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      labels: ['architecture', 'ux'],
      subtasks: [
        { _id: generateId(), title: 'Create DB Schemas', completed: true },
        { _id: generateId(), title: 'Define Role Permissions', completed: true },
      ],
      order: 0,
      createdAt: new Date(),
    },
    {
      _id: task2Id,
      title: 'Build Secure JWT Authentication & Role Middleware',
      description: 'Implement login, register, token verification, and owner/manager/employee permission checks.',
      project: { _id: project1Id, name: project1.name, key: project1.key },
      workspace: workspaceId,
      organization: orgId,
      creator: { _id: managerId, name: manager.name, email: manager.email },
      assignee: { _id: managerId, name: manager.name, email: manager.email },
      status: 'done',
      priority: 'urgent',
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      labels: ['backend', 'security'],
      subtasks: [{ _id: generateId(), title: 'Hash passwords with bcrypt', completed: true }],
      order: 1,
      createdAt: new Date(),
    },
    {
      _id: task3Id,
      title: 'Implement Interactive Kanban Board with Drag & Drop',
      description: 'Build responsive Kanban columns for Todo, In Progress, Review, and Done with smooth drag-and-drop state updates.',
      project: { _id: project1Id, name: project1.name, key: project1.key },
      workspace: workspaceId,
      organization: orgId,
      creator: { _id: managerId, name: manager.name, email: manager.email },
      assignee: { _id: employeeId, name: employee.name, email: employee.email },
      status: 'in_progress',
      priority: 'high',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      labels: ['frontend', 'kanban'],
      subtasks: [
        { _id: generateId(), title: 'Column layout with status headers', completed: true },
        { _id: generateId(), title: 'HTML5 drag-and-drop handlers', completed: false },
      ],
      order: 0,
      createdAt: new Date(),
    },
    {
      _id: task4Id,
      title: 'Add Dynamic Task Search & Multi-criteria Filtering',
      description: 'Filter tasks instantly by priority (low, medium, high, urgent), status, and assignee in real-time.',
      project: { _id: project1Id, name: project1.name, key: project1.key },
      workspace: workspaceId,
      organization: orgId,
      creator: { _id: ownerId, name: owner.name, email: owner.email },
      assignee: { _id: employeeId, name: employee.name, email: employee.email },
      status: 'todo',
      priority: 'urgent',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      labels: ['frontend', 'filters'],
      subtasks: [{ _id: generateId(), title: 'Search query debounce', completed: false }],
      order: 0,
      createdAt: new Date(),
    },
  ];

  for (const t of rawTasks) {
    t.subtasks.id = function (id) {
      return this.find((st) => st._id.toString() === id.toString());
    };
    memoryStore.tasks.push(wrapDocument(t, 'tasks'));
  }
};

class MemoryQuery {
  constructor(data) {
    this.data = Array.isArray(data) ? [...data] : (data ? [{ ...data }] : []);
  }

  populate() {
    return this;
  }

  select() {
    return this;
  }

  sort() {
    return this;
  }

  then(resolve, reject) {
    resolve(this.data);
  }
}

class SingleQuery {
  constructor(item) {
    this.item = item ? item : null;
  }

  populate() {
    return this;
  }

  select() {
    return this;
  }

  sort() {
    return this;
  }

  then(resolve, reject) {
    resolve(this.item);
  }
}

const createMemoryModel = (collectionName) => {
  return {
    find: (filter = {}) => {
      let list = memoryStore[collectionName] || [];
      if (filter.organization) {
        list = list.filter((item) => {
          const org = item.organization?._id || item.organization;
          return org?.toString() === filter.organization.toString();
        });
      }
      if (filter.project) {
        list = list.filter((item) => {
          const proj = item.project?._id || item.project;
          return proj?.toString() === filter.project.toString();
        });
      }
      if (filter.status && filter.status !== 'all') {
        list = list.filter((item) => item.status === filter.status);
      }
      if (filter.priority && filter.priority !== 'all') {
        list = list.filter((item) => item.priority === filter.priority);
      }
      if (filter.assignee && filter.assignee !== 'all') {
        list = list.filter((item) => {
          const asg = item.assignee?._id || item.assignee;
          return asg?.toString() === filter.assignee.toString();
        });
      }
      if (filter.$or && Array.isArray(filter.$or)) {
        list = list.filter((item) => {
          return filter.$or.some((clause) => {
            if (clause.title?.$regex) {
              const regex = new RegExp(clause.title.$regex, clause.title.$options || 'i');
              if (regex.test(item.title || '')) return true;
            }
            if (clause.description?.$regex) {
              const regex = new RegExp(clause.description.$regex, clause.description.$options || 'i');
              if (regex.test(item.description || '')) return true;
            }
            return false;
          });
        });
      }
      return new MemoryQuery(list);
    },

    findOne: (filter = {}) => {
      const list = memoryStore[collectionName] || [];
      const item = list.find((it) => {
        if (filter._id && it._id.toString() !== filter._id.toString()) return false;
        if (filter.email && it.email.toLowerCase() !== filter.email.toLowerCase()) return false;
        if (filter.key && it.key !== filter.key) return false;
        if (filter.organization) {
          const org = it.organization?._id || it.organization;
          if (org?.toString() !== filter.organization.toString()) return false;
        }
        return true;
      });
      return new SingleQuery(item);
    },

    findById: (id) => {
      const list = memoryStore[collectionName] || [];
      const item = list.find((it) => it._id.toString() === id.toString());
      return new SingleQuery(item);
    },

    create: async (payload) => {
      const isArray = Array.isArray(payload);
      const items = isArray ? payload : [payload];
      const created = [];

      for (const item of items) {
        const doc = wrapDocument({
          _id: generateId(),
          ...item,
          createdAt: new Date(),
        }, collectionName);

        if (doc.subtasks && Array.isArray(doc.subtasks)) {
          doc.subtasks = doc.subtasks.map((st) => ({
            _id: generateId(),
            ...st,
          }));
          doc.subtasks.id = function (subId) {
            return this.find((s) => s._id.toString() === subId.toString());
          };
        }

        if (collectionName === 'users') {
          doc.matchPassword = async function (entered) {
            return await bcrypt.compare(entered, this.password);
          };
          if (!doc.password.startsWith('$2a$') && !doc.password.startsWith('$2b$')) {
            const salt = await bcrypt.genSalt(10);
            doc.password = await bcrypt.hash(doc.password, salt);
          }
        }

        memoryStore[collectionName].push(doc);
        created.push(doc);
      }

      return isArray ? created : created[0];
    },

    countDocuments: async (filter = {}) => {
      let list = memoryStore[collectionName] || [];
      if (filter.organization) {
        list = list.filter((it) => {
          const org = it.organization?._id || it.organization;
          return org?.toString() === filter.organization.toString();
        });
      }
      if (filter.status) {
        if (filter.status.$ne) {
          list = list.filter((it) => it.status !== filter.status.$ne);
        } else {
          list = list.filter((it) => it.status === filter.status);
        }
      }
      if (filter.project) {
        list = list.filter((it) => {
          const pr = it.project?._id || it.project;
          return pr?.toString() === filter.project.toString();
        });
      }
      if (filter.assignee && filter.assignee.$ne === null) {
        list = list.filter((it) => it.assignee !== null);
      }
      if (filter.dueDate && filter.dueDate.$lt) {
        list = list.filter((it) => it.dueDate && new Date(it.dueDate) < filter.dueDate.$lt);
      }
      return list.length;
    },

    // Only removes documents that match the filter (an empty filter removes all).
    deleteMany: async (filter = {}) => {
      const keys = Object.keys(filter);
      const matches = (item) =>
        keys.every((key) => {
          const actual = item[key] && item[key]._id ? item[key]._id : item[key];
          return actual !== undefined && actual !== null && actual.toString() === String(filter[key]);
        });
      const before = memoryStore[collectionName].length;
      memoryStore[collectionName] =
        keys.length === 0 ? [] : memoryStore[collectionName].filter((item) => !matches(item));
      return { acknowledged: true, deletedCount: before - memoryStore[collectionName].length };
    },

    deleteOne: async (filter = {}) => {
      if (filter._id) {
        memoryStore[collectionName] = memoryStore[collectionName].filter(
          (it) => it._id.toString() !== filter._id.toString()
        );
      }
      return { acknowledged: true, deletedCount: 1 };
    },
  };
};

module.exports = {
  initMemoryStore,
  memoryStore,
  MemoryUser: createMemoryModel('users'),
  MemoryOrganization: createMemoryModel('organizations'),
  MemoryWorkspace: createMemoryModel('workspaces'),
  MemoryProject: createMemoryModel('projects'),
  MemoryTask: createMemoryModel('tasks'),
  MemoryMembership: createMemoryModel('memberships'),
};
