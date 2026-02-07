import { describe, expect, it } from 'vitest';

import {
  countStatementStages,
  getStatementStageActions,
  isStageActionBlocked,
} from '../statement-workflow';

describe('statement workflow helpers', () => {
  it('returns submit action for submit stage', () => {
    expect(getStatementStageActions('submit')).toEqual([
      {
        id: 'submitForApproval',
        nextStage: 'approve',
        redirectPath: '/statements/approve',
      },
    ]);
  });

  it('returns unapprove and pay actions for approve stage', () => {
    expect(getStatementStageActions('approve')).toEqual([
      {
        id: 'unapprove',
        nextStage: 'submit',
        redirectPath: '/statements/submit',
      },
      {
        id: 'pay',
        nextStage: 'pay',
        redirectPath: '/statements/pay',
      },
    ]);
  });

  it('returns rollback action for pay stage', () => {
    expect(getStatementStageActions('pay')).toEqual([
      {
        id: 'rollbackToApprove',
        nextStage: 'approve',
        redirectPath: '/statements/approve',
      },
    ]);
  });

  it('counts statements by stage using stored stage map', () => {
    expect(
      countStatementStages(['s1', 's2', 's3', 's4'], {
        s1: 'approve',
        s2: 'pay',
      }),
    ).toEqual({
      submit: 2,
      approve: 1,
      pay: 1,
    });
  });

  it('ignores stage ids that are not in the current statement list', () => {
    expect(
      countStatementStages(['s1'], {
        ghost: 'approve',
      }),
    ).toEqual({
      submit: 1,
      approve: 0,
      pay: 0,
    });
  });

  it('blocks submit action when at least one transaction has no category', () => {
    expect(isStageActionBlocked('submitForApproval', 1)).toBe(true);
  });

  it('does not block submit action when all transactions are categorized', () => {
    expect(isStageActionBlocked('submitForApproval', 0)).toBe(false);
  });

  it('does not block non-submit actions', () => {
    expect(isStageActionBlocked('pay', 10)).toBe(false);
    expect(isStageActionBlocked('unapprove', 10)).toBe(false);
  });
});
