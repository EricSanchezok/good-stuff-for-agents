import { execFileSync } from 'node:child_process'
import { ISSUE_INTAKE_LIMITS, TRUSTED_REPOSITORY } from './issue-intake.mjs'

export function createGhIssueClient({ execFile = execFileSync } = {}) {
  return {
    listOpenIssues() {
      return ghJsonPaginated(execFile, `repos/${TRUSTED_REPOSITORY}/issues?state=open&per_page=100`)
        .filter((issue) => issue.pull_request == null)
        .map((issue) => buildPayload(execFile, issue))
    },
    fetchIssue({ repository, issueNumber }) {
      assertTarget(repository, issueNumber)
      const issue = ghJson(execFile, `repos/${TRUSTED_REPOSITORY}/issues/${issueNumber}`)
      if (issue.pull_request != null) throw new Error(`Issue #${issueNumber} is a pull request`)
      return buildPayload(execFile, issue)
    },
    postComment({ repository, issueNumber, body }) {
      assertTarget(repository, issueNumber)
      if (typeof body !== 'string' || body.length === 0) throw new Error('body must be a non-empty string')
      const result = ghJson(execFile, `repos/${TRUSTED_REPOSITORY}/issues/${issueNumber}/comments`, [
        '--method', 'POST', '-f', `body=${body}`,
      ])
      if (!Number.isInteger(result.id) || result.id <= 0) throw new Error('GitHub did not return a positive comment ID')
      return { comment_id: result.id }
    },
  }
}

function buildPayload(execFile, issue) {
  const comments = ghJsonPaginated(execFile, `repos/${TRUSTED_REPOSITORY}/issues/${issue.number}/comments?per_page=100`)
  const declaredCommentCount = Number(issue.comments ?? 0)
  const commentsComplete = declaredCommentCount === comments.length && comments.length <= ISSUE_INTAKE_LIMITS.commentCount
  return {
    repository: { full_name: TRUSTED_REPOSITORY },
    issue: {
      number: issue.number,
      title: issue.title,
      body: issue.body ?? '',
      updated_at: issue.updated_at,
      state: issue.state,
      labels: (issue.labels ?? []).map((label) => ({ name: typeof label === 'string' ? label : label.name })),
    },
    comments: comments.map((comment) => ({
      id: comment.id,
      body: comment.body ?? '',
      author: { login: comment.user?.login ?? null },
      created_at: comment.created_at,
      updated_at: comment.updated_at,
    })),
    comments_complete: commentsComplete,
    labels_complete: true,
  }
}

function ghJson(execFile, endpoint, extraArgs = []) {
  const output = execFile('gh', ['api', endpoint, ...extraArgs], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  try {
    return JSON.parse(String(output))
  } catch (error) {
    throw new Error(`gh api returned invalid JSON for ${endpoint}: ${error.message}`)
  }
}

function ghJsonPaginated(execFile, endpoint) {
  const output = execFile('gh', ['api', endpoint, '--paginate', '--slurp'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  try {
    const pages = JSON.parse(String(output))
    if (!Array.isArray(pages) || pages.some((page) => !Array.isArray(page))) {
      throw new Error('paginated response must be an array of pages')
    }
    return pages.flat()
  } catch (error) {
    throw new Error(`gh api returned invalid paginated JSON for ${endpoint}: ${error.message}`)
  }
}

function assertTarget(repository, issueNumber) {
  if (repository !== TRUSTED_REPOSITORY) throw new Error(`repository must be ${TRUSTED_REPOSITORY}`)
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) throw new Error('issueNumber must be a positive integer')
}
