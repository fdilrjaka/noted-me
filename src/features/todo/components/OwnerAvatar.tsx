import type { TodoOwner } from "../hooks/useTodoOwner";

export function OwnerAvatar({
  owner,
  className = "size-6",
}: {
  owner: TodoOwner;
  className?: string;
}) {
  if (owner.avatarUrl) {
    return (
      <img
        src={owner.avatarUrl}
        alt=""
        className={`${className} flex-none rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${className} flex flex-none items-center justify-center rounded-full text-[0.65em] font-semibold text-white`}
      style={{ backgroundColor: owner.color }}
    >
      {owner.initial}
    </span>
  );
}
