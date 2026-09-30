import { parseDocument } from "htmlparser2";
import { selectAll, selectOne } from "css-select";
import { chromium } from "playwright";

const adNetworkPatterns = [
    '**/*doubleclick.net/**',
    '**/*googleadservices.com/**',
    '**/*googlesyndication.com/**',
    // Add more patterns as needed
].map(pattern => {
    return new RegExp(
        pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\./g, '\\.')
    );
});

const getText = (element) => {
    if (element.type === 'text') return element.data;

    if (element.children) return element.children.map(getText).join('').trim();
    return '';
};

const extractTeacherInfo = async (teacherInfo) => {
    const dom = parseDocument(teacherInfo);

    // Extract professor's name
    const nameElement = selectOne('.NameTitle__Name-dowf0z-0', dom);
    const firstName = getText(selectOne('span', nameElement));
    const lastName = getText(selectOne('.NameTitle__LastNameWrapper-dowf0z-2', nameElement)).split(' ')[0];
    const fullName = `${firstName} ${lastName}`;

    // Extract average rating
    const avgRating = getText(selectOne('.RatingValue__Numerator-qw8sqy-2', dom));

    // Extract "Would take again" percentage
    const wouldTakeAgain = getText(selectOne('.FeedbackItem__FeedbackNumber-uof32n-1', dom));

    // Extract difficulty levelc
    const difficultyLevel = getText(selectAll('.FeedbackItem__FeedbackNumber-uof32n-1', dom)[1]);

    // Extract top tags
    const tags = selectAll('.Tag-bs9vf4-0', dom).map(getText);

    return {
        name: fullName,
        averageRating: avgRating,
        wouldTakeAgain: wouldTakeAgain,
        difficultyLevel: difficultyLevel,
        topTags: tags
    };
};

const extractReviews = async (htmlContent) => {
    const dom = parseDocument(htmlContent);
    const reviews = [];

    // Find all review elements
    const reviewElements = selectAll('.Rating__RatingBody-sc-1rhvpxz-0', dom);

    reviewElements.forEach((review) => {
        const reviewData = {};

        // Extract class name
        const className = selectAll('.RatingHeader__StyledClass-sc-1dlkqw1-3', review)[0];
        reviewData.class = className ? getText(className).trim() : 'N/A';

        // Extract date
        const date = selectAll('.TimeStamp__StyledTimeStamp-sc-9q2r30-0', review)[0];
        reviewData.date = date ? getText(date).trim() : 'N/A';

        // Extract quality rating
        const quality = selectAll('.CardNumRating__CardNumRatingNumber-sc-17t4b9u-2', review)[0];
        reviewData.quality = quality ? getText(quality).trim() : 'N/A';

        // Extract difficulty rating
        const difficultyElements = selectAll('.CardNumRating__CardNumRatingNumber-sc-17t4b9u-2', review);
        reviewData.difficulty = difficultyElements.length > 1 ? getText(difficultyElements[1]).trim() : 'N/A';

        // Extract comment
        const comment = selectAll('.Comments__StyledComments-dzzyvm-0', review)[0];
        reviewData.comment = comment ? getText(comment).trim() : 'N/A';

        reviews.push(reviewData);
    });

    return reviews;
}

export async function scrapeRMP(rmpLink){
    /*
    input: "https://www.ratemyprofessors.com/professor/(7 digit professor identifier)"
    output: array [teacherInfo, reviews]
        - teacherInfo: {name, avgRating, wouldTakeAgain, difficultyLevel, topTags}
        - reviews: list of review objects {class, date, quality, difficulty, comment}
     */
    let teacherInfoHtml;
    let reviewsHtml;
    let browser;

    console.time('scraping');

    try{
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        page.setDefaultNavigationTimeout(2 * 60 * 1000);

        // Use route() to intercept and block certain types of resources and ad network requests
        await page.route('**/*', (route) => {
            const requestUrl = route.request().url();
            const resourceType = route.request().resourceType();

            // Check if the request is for an ad network
            const isAdRequest = adNetworkPatterns.some(pattern => requestUrl.match(pattern));

            if (['image', 'stylesheet', 'font'].includes(resourceType)|| isAdRequest) {
                route.abort();
            } else {
                route.continue();
            }
        });

        await page.goto(link);

        // Scrape teacher info html and review html
        [teacherInfoHtml, reviewsHtml] = await page.evaluate(async () => {
            const info = document.querySelector('.TeacherInfo__StyledTeacher-ti1fio-1.kFNvIp').innerHTML
            const reviews = document.querySelector('.RatingsList__RatingsUL-hn9one-0.cbdtns').innerHTML
            return [info, reviews]
        });

    } catch(e) {
        console.error('scrape-failed', e);

    } finally {
        await browser?.close();
    }

    console.timeEnd('scraping');

    // parse html to extract relevant info
    console.time('parsing scraped html');

    const teacherInfo = await extractTeacherInfo(teacherInfoHtml);
    const reviews = await extractReviews(reviewsHtml)

    console.timeEnd('parsing scraped html');

    console.log(teacherInfo)
    console.log(reviews)

    return [teacherInfo, reviews]
};