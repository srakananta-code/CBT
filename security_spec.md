# Security Specification: E-UJIAN SEKOLAH

## 1. Data Invariants

1. **Role Protection & Privilege Escalation Guard**:
   - `users/{userId}`: No user can self-assign or escalate their `role` (admin, teacher, student).
   - Only verified administrators or pre-approved system registration can assign elevated roles.
   - PII data (`email`, `nisn`, `nip`) can only be read by the owner or administrator/teacher.

2. **Absolute Answer Key Isolation**:
   - `answerKeys/{keyId}`: Strictly inaccessible to any user with role `student`.
   - Only `admin` and `teacher` (owner/subject coordinator) can read or write answer keys.
   - Examination items (`examItems`) and questions sent to students must omit correct answer fields.

3. **Student Answer Integrity & Session Ownership**:
   - `answers/{answerId}`: A student may only create or update their own answer where `request.auth.uid == incoming().studentId`.
   - Cannot overwrite another student's answer record.
   - Answers cannot be written once the parent `examSession` is in `submitted` or `timed_out` state.

4. **Exam Session Immutability**:
   - A student can create their own session for an active exam.
   - Once submitted (`status == 'submitted'`), terminal state locking applies: no further modification of answers or session times.

5. **Result & Grade Tamper Prevention**:
   - `results/{resultId}`: Only server or teachers/admins can create or update exam scores.
   - Students have read-only access to published results belonging solely to their own `studentId`.

6. **Question Bank Ownership**:
   - Teachers may only create questions for their authorized subjects, and modify questions they created.
   - Admins have complete supervisory control over all question banks.

---

## 2. The Dirty Dozen Payloads (Targeting PERMISSION_DENIED)

1. **Payload 1 (Student Role Escalation)**:
   Student sends `{ role: 'admin' }` update to `/users/{studentUid}`. -> REJECTED.
2. **Payload 2 (Student Snooping Answer Keys)**:
   Student calls `get(/answerKeys/{keyId})`. -> REJECTED.
3. **Payload 3 (Student Listing Answer Keys)**:
   Student queries `collection('/answerKeys')`. -> REJECTED.
4. **Payload 4 (Student Modifying Another Student's Answers)**:
   Student A writes to `/answers/{answerId}` where `studentId: 'student_B'`. -> REJECTED.
5. **Payload 5 (Student Fabricating Exam Results)**:
   Student writes `{ finalScore: 100, status: 'published' }` to `/results/{resultId}`. -> REJECTED.
6. **Payload 6 (Student Viewing Unreleased Results)**:
   Student reads `/results/{resultId}` where `status: 'pending'`. -> REJECTED.
7. **Payload 7 (Unauthenticated Read on Question Bank)**:
   Anonymous user attempts `get(/questionBank/{qId})`. -> REJECTED.
8. **Payload 8 (Student Creating Exam Package)**:
   Student creates document in `/exams/{examId}`. -> REJECTED.
9. **Payload 9 (Post-Submission Answer Tampering)**:
   Student attempts to update `/answers/{ansId}` when session is already marked `submitted`. -> REJECTED.
10. **Payload 10 (Ghost Field Injection / Shadow Update)**:
    Teacher attempts update on question with `{ __maliciousPayload: true, bypass: true }`. -> REJECTED by strict keys / schema.
11. **Payload 11 (Denial of Wallet Huge Payload)**:
    Attacker writes 5MB text string into `questionText`. -> REJECTED by length limits.
12. **Payload 12 (Foreign Exam Session Hijacking)**:
    Student A attempts to complete or submit `examSessions/{sessionId}` belonging to student B. -> REJECTED.
