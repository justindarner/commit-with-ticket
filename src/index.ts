import * as colors from 'colors';
import * as fs from 'fs';
import * as branch from 'git-branch';
import { combineLatest, from, Subject } from 'rxjs';
import { filter, map, mergeMap } from 'rxjs/operators';

const messageFile = (process.env.HUSKY_GIT_PARAMS || '').split(' ')[0];
if (!messageFile) {
  process.exit(0);
}

// helper function to get current commit message
const getCommitMessage = () => {
  const subject = new Subject<string>();
  fs.readFile(messageFile, (err, message) => {
    if (err) {
      subject.error(err);
      subject.complete();
      return;
    }
    subject.next(message.toString());
    subject.complete();
  });
  return subject;
};

// helper function to write current commit message
const writeCommitMessage = (message: string) => {
  const subject = new Subject();
  fs.writeFile(messageFile, message, err => {
    if (err) {
      console.error('err', err);
      subject.error(err);
      subject.complete();
      return;
    }
    subject.next();
    subject.complete();
  });
  return subject;
};

combineLatest([
  // get issue prefix
  from(process.argv.slice(-1)),
  // get branch name
  from(branch() as Promise<string>),
  // get
  getCommitMessage(),
])
  .pipe(
    map(([issuePrefix, branchName, commitMessage]) => {
      // no need to add issue number if commit already has it
      if (commitMessage.includes(`${issuePrefix}-`)) {
        return '';
      }
      const issue = branchName.match(new RegExp(`(${issuePrefix}-\\d+)`));
      const prefix = issue ? `${issue[1]}: ` : '';
      return `${prefix}${commitMessage}`;
    }),
    filter(newMessage => !!newMessage),
    mergeMap(newMessage => {
      console.log(colors.green.bold('ⓘ   ➜➜'), 'Adding ticket', colors.green.bold(newMessage));
      return writeCommitMessage(newMessage);
    }),
  )
  .subscribe();
