import { useEffect, useState } from 'react';

import { getFamilyMember } from '../js/api.js';

function formatFullDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function MemberModal({ memberId, onClose }) {
  const [member, setMember] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setMember(null);
    setError(null);

    getFamilyMember(memberId)
      .then((data) => !cancelled && setMember(data))
      .catch((err) => !cancelled && setError(err));

    return () => {
      cancelled = true;
    };
  }, [memberId]);

  // Escape to dismiss, and lock the page behind the modal.
  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const born = formatFullDate(member?.date_of_birth);
  const died = formatFullDate(member?.date_of_death);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Family member"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface-lowest shadow-ambient">
        <div className="relative p-8 sm:p-12">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-high hover:text-primary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>

          {!member && !error && (
            <div className="flex flex-col items-center py-16">
              <span className="block h-7 w-7 animate-spin rounded-full border-2 border-outline border-t-primary" />
              <p className="mt-4 font-display text-sm italic text-ink-faint">Retrieving…</p>
            </div>
          )}

          {error && (
            <p className="py-16 text-center font-display text-ink-soft">
              {error.message || 'This record could not be opened.'}
            </p>
          )}

          {member && (
            <>
              <div className="flex flex-col items-center text-center">
                {member.profile_image ? (
                  <img
                    src={member.profile_image}
                    alt={member.full_name}
                    className="h-28 w-28 rounded-full border-2 border-outline-variant object-cover shadow-artifact"
                  />
                ) : (
                  <span className="flex h-28 w-28 items-center justify-center rounded-full bg-primary-soft font-display text-3xl font-bold text-primary">
                    {member.full_name?.[0] || '?'}
                  </span>
                )}

                {member.title && (
                  <p className="label-eyebrow mt-6">{member.title}</p>
                )}
                <h2 className="mt-3 font-display text-3xl font-bold tracking-display">
                  {member.full_name}
                </h2>

                {(born || died) && (
                  <p className="mt-3 font-body text-sm text-ink-faint">
                    {born && <span>Born {born}</span>}
                    {born && died && <span className="mx-2">&middot;</span>}
                    {died && <span>Passed {died}</span>}
                  </p>
                )}

                {member.parent_name && (
                  <p className="mt-2 font-display text-sm italic text-ink-soft">
                    Child of {member.parent_name}
                  </p>
                )}
              </div>

              <div className="ornament my-9">
                <span className="text-sm">&#10047;</span>
              </div>

              {member.biography ? (
                <div className="prose-archive space-y-4">
                  {member.biography
                    .split(/\n\s*\n/)
                    .map((block) => block.trim())
                    .filter(Boolean)
                    .map((paragraph, index) => (
                      // Biography order is stable for a given record.
                      // eslint-disable-next-line react/no-array-index-key
                      <p key={index}>{paragraph}</p>
                    ))}
                </div>
              ) : (
                <p className="text-center font-display italic text-ink-faint">
                  No biography has been written for this member yet.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
