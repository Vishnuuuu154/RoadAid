import { User, Wrench, Check } from "lucide-react";

const ROLES = [
    {
        value: "CUSTOMER",
        title: "Customer",
        description: "Get roadside assistance",
        icon: User,
    },
    {
        value: "MECHANIC",
        title: "Mechanic",
        description: "Provide roadside assistance",
        icon: Wrench,
    },
];

/**
 * Accessible role selector rendered as a radiogroup of two cards.
 * value / onChange mirror a controlled input's contract so it can
 * plug into the existing formData state without changes elsewhere.
 */
function RoleSelector({ value, onChange, name = "role" }) {
    return (
        <div className="role-selector" role="radiogroup" aria-label="Register as">
            {ROLES.map(({ value: roleValue, title, description, icon: Icon }) => {
                const selected = value === roleValue;
                return (
                    <button
                        key={roleValue}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`role-card ${selected ? "role-card-selected" : ""}`}
                        onClick={() => onChange({ target: { name, value: roleValue } })}
                    >
                        <span className="role-card-icon">
                            <Icon size={20} strokeWidth={1.8} />
                        </span>

                        <span className="role-card-text">
                            <span className="role-card-title">{title}</span>
                            <span className="role-card-description">{description}</span>
                        </span>

                        <span className="role-card-check" aria-hidden="true">
                            {selected && <Check size={14} strokeWidth={2.5} />}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

export default RoleSelector;