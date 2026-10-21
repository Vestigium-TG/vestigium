// Ícone SVG genérico (traço) usado em todas as telas.
function Icon({ children, size = 16, className = "" }) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{children}
		</svg>
	);
}

// Ícone "faísca" que identifica conteúdo gerado/sugerido por IA.
export function SparkIcon({ size = 14, className = "" }) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M9.5 2.5 11 8l5.5 1.5L11 11l-1.5 5.5L8 11 2.5 9.5 8 8l1.5-5.5Z" />
			<path d="m17.5 12 .9 3.1 3.1.9-3.1.9-.9 3.1-.9-3.1-3.1-.9 3.1-.9.9-3.1Z" />
		</svg>
	);
}

export default Icon;
