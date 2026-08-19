function getGoogleAccountLocalPart(email) {
    const [local = email] = email.split("@");
    return local || email;
}
export function formatGoogleAccountLabel(email, _style) {
    if (!email)
        return "Unknown";
    return `${getGoogleAccountLocalPart(email).slice(0, 3)}…`;
}
export function createGoogleAccountLabelMap(emails, style) {
    const uniqueEmails = [...new Set(emails.filter((email) => Boolean(email)))];
    const labels = new Map(uniqueEmails.map((email) => [email, formatGoogleAccountLabel(email, style)]));
    const emailsByLabel = new Map();
    for (const email of uniqueEmails) {
        const label = labels.get(email);
        emailsByLabel.set(label, [...(emailsByLabel.get(label) ?? []), email]);
    }
    for (const collidingEmails of emailsByLabel.values()) {
        if (collidingEmails.length < 2)
            continue;
        const localParts = collidingEmails.map(getGoogleAccountLocalPart);
        const distinctLocalParts = [...new Set(localParts)];
        const maxLength = Math.max(...distinctLocalParts.map((local) => local.length));
        let prefixLength = distinctLocalParts.length === 1 ? maxLength : 4;
        while (prefixLength <= maxLength &&
            new Set(distinctLocalParts.map((local) => local.slice(0, prefixLength))).size <
                distinctLocalParts.length) {
            prefixLength += 1;
        }
        const emailsByPrefix = new Map();
        collidingEmails.forEach((email, index) => {
            const local = localParts[index];
            const prefix = local.slice(0, Math.min(prefixLength, local.length));
            emailsByPrefix.set(prefix, [...(emailsByPrefix.get(prefix) ?? []), email]);
        });
        for (const [prefix, matchingEmails] of emailsByPrefix) {
            matchingEmails.forEach((email, index) => {
                labels.set(email, `${prefix}…${matchingEmails.length > 1 ? ` ${index + 1}` : ""}`);
            });
        }
    }
    return labels;
}
export function formatGoogleAccountErrors(errors, style, labels) {
    if (!errors || errors.length === 0)
        return [];
    return errors.map((error) => ({
        label: (error.email && labels?.get(error.email)) ?? formatGoogleAccountLabel(error.email, style),
        message: error.error,
    }));
}
//# sourceMappingURL=google-account-format.js.map