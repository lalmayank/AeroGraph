<!-- SPECKIT START -->

## Repository Orientation Order

All agents MUST understand the repository in this order:

1. specs/000-platform-vision
2. .specify/memory/constitution.md
3. current feature spec (specs/001-*)
4. ADRs
5. tasks.md
6. implementation code

The platform vision and constitution supersede implementation convenience.

Agents should retrieve only the minimum necessary context required for the current task while respecting this orientation order.

Current implementation plan:
specs/003-python-support/plan.md

Current implementation tasks:
specs/001-agent-flight-recorder/tasks.md


For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
