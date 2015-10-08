export default function getCookie(key) {
    var regex = new RegExp(`(?:^|;)\\s?${key}=(.*?)(?:;|$)`,'i'),
        match = document.cookie.match(regex);

    return match && unescape(match[1]);
}