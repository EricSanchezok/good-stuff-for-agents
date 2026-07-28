import { execFileSync } from 'node:child_process'
import { TRUSTED_REPOSITORY } from './issue-intake.mjs'

export function createGhIssueCommentRunner({ execFile = execFileSync } = {}) {
  return async function commentRunner({ repository, issueNumber, body }) {
    if (repository !== TRUSTED_REPOSITORY) throw new Error(`repository must be ${TRUSTED_REPOSITORY}`)
    if (!Number.isInteger(issueNumber) || issueNumber <= 0) throw new Error('issueNumber must be a positive integer')
    if (typeof body !== 'string' || body.length === 0) throw new Error('body must be a non-empty string')

    const output = execFile(
      'gh',
      ['issue', 'comment', String(issueNumber), '--repo', TRUSTED_REPOSITORY, '--body', body],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
    const match = String(output).match(/issuecomment-(\d+)/u)
    if (!match) throw new Error('gh issue comment did not return a comment URL')
    return { comment_id: Number(match[1]) }
  }
}
