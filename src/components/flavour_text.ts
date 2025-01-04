import { Collection } from "../simulator/collection"
import { Modifier } from "../simulator/modifier"
import { Progress, Statistics } from "../simulator/settings"
import { random_element } from "../utils/array_utils"
import { get_weighted_random, WeightedString } from "../utils/weighted_randomness"

export function get_flavour_text(active_modifier: Modifier | undefined, affordable_modifier_count: number): HTMLElement {
    let element_type = 'h2'
    let flavour_text = 'ERROR, NO FLAVOUR TEXT'
    if (active_modifier) { // Indicates a full clear and a chained modifier
        flavour_text = `Full clear!<br>The effects of <mark>${active_modifier.title}</mark> still linger...`
    }
    else if (Collection.get_all_items().every((item) => Collection.get_item_count(item) === 0)) { // No items collected
        if (Statistics.rounds_played === 0) {
            flavour_text = 'Your journey into the underground begins...<br>Click the screen to mine out terrain.<br>There are surely treasures to be found underneath<br>the rich soils...'
        }
        else if (Statistics.rounds_played === 1) {
            flavour_text = 'That was a good attempt!<br>Try mining the more shallow soil first.'
        }
        else if (Statistics.rounds_played === 2) {
            flavour_text = 'An item will sparkle and flash once it<br>has been fully unearthed.<br>Keep at it!'
        }
        else if (Statistics.rounds_played === 3) {
            flavour_text = 'Sometimes you just get unlucky!<br>Keep trying.'
        }
        else if (Statistics.rounds_played === 4) {
            flavour_text = 'Even through hardship, persist.'
        }
        else { // Still have no items after 5 rounds
            flavour_text = random_element([ "You've got it the next time!<br>Keep digging.",
                "You're doing great!<br>Keep trying.",
                "Don't give up now!<br>The treasure is close." ])
        }
    }
    else { // Not a full clear, and at least one item has been collected
        if (Statistics.rounds_played < 5) {
            flavour_text = get_weighted_random([
                new WeightedString('Great work!', 100),
                new WeightedString('You are on the right track!', 70),
                new WeightedString("Don't stop now!", 60),
                new WeightedString('Your efforts will be rewarded soon.', 50),
                new WeightedString('The underground is full of wonders.', 30),
                new WeightedString('Your persistence will pay off.', 10)
            ]).value + '<br>Your journey underground continues...'
        }
        else if (Statistics.rounds_played < 20) { // Between 5 and 20 rounds
            if (Statistics.modifiers_purchased === 0) {
                if (affordable_modifier_count === 0) { // Played more than 20 rounds and can't afford any modifiers
                    flavour_text = 'Once you collect some more items,<br>you can purchase modifiers here.'
                }
                else { // First modifier purchase
                    flavour_text = "You can now afford your first modifier!<br>Modifiers change the rules of the game, for a price."
                }
            }
            else { // Played less than 20 rounds and have purchased at least one modifier
                if (affordable_modifier_count === 0) {
                    flavour_text = get_weighted_random([
                        new WeightedString('Keep collecting items to afford more modifiers.', 100),
                        new WeightedString('Modifiers are a true wonder...<br>If only you could afford some.', 10)
                    ]).value
                }
                else { // Can afford, played less than 20 rounds
                    flavour_text = get_weighted_random([
                        new WeightedString('The early days are the best.', 100),
                        new WeightedString('Ah, the smell of cave soil!', 100),
                        new WeightedString('Hm, those hammers sure are handy.', 10),
                        new WeightedString('You wonder if you packed anything to eat.', 10)
                    ]).value + '<br>Your journey underground continues...'
                }
            }
        }
        else {
            element_type = 'h3'

            if (affordable_modifier_count === 0) {
                flavour_text = get_weighted_random([
                    new WeightedString('When life gives you lemons<br>Think about how you handle your economy.', 100),
                    new WeightedString("Only through hardship do we learn<br>true value.", 90),
                    new WeightedString("Spare some change?", 80),
                    new WeightedString("Working hard or hardly working?", 70),
                    new WeightedString("Would animate a moth flying out<br>of your wallet, but can't be bothered.", 50),
                    new WeightedString("Digging is hard work,<br>but someone's gotta do it.", 40),
                    new WeightedString("Every strike brings you closer<br>to the treasure.", 30),
                    new WeightedString("Keep your tools sharp<br>and your wits sharper.", 25),
                    new WeightedString("The underground holds many secrets,<br>keep digging!", 20),
                    new WeightedString("Persistence is key,<br>never give up!", 15),
                    new WeightedString("The walls are whispering...<br>Can you hear them?", 14),
                    new WeightedString("Are the rocks starting to look like faces?", 13),
                    new WeightedString("You could swear you saw something<br>move in the shadows...", 12),
                    new WeightedString("The deeper you go, the stranger things get...", 11),
                    new WeightedString("Why do you feel like you're being watched?", 10),
                    new WeightedString("Did you hear that?<br>Sounded like a growl...", 9),
                    new WeightedString("The walls are closing in...<br>Or is it just your imagination?", 8),
                    new WeightedString("You feel like the rocks are laughing at you.", 7),
                    new WeightedString("Is it normal for the ground to<br>feel like it's breathing?", 6),
                    new WeightedString("You can't shake the feeling that<br>you're not alone down here.", 5),
                    new WeightedString("The deeper you dig, the more<br>it feels like you're digging your own grave.", 4),
                    new WeightedString("Sometimes you wonder if you'll ever<br>see the light of day again.", 3),
                    new WeightedString("The underground is a maze,<br>and you're just rats in a trap.", 2)
                ].filter((weighted_string) => (weighted_string.get_weight() / 100) > 1 - (Statistics.rounds_played / 300))).value
            }
            else { // regular flavour text
                const flavour_texts = [
                    new WeightedString('Just working the soils...', 100),
                    new WeightedString('The red hammer is more economic,<br>it breaks more tiles for the same health.', 100),
                    new WeightedString('Have you learned to identify<br>items through barely cracked soil yet?', 100),
                    new WeightedString('What\'s your favourite modifier?<br>Mine is space time rift.', 100),
                    new WeightedString('What\'s your favourite Pokémon game?', 100),
                    new WeightedString('Have you found an oval stone yet?<br>Those are rare.', 10)
                ]

                if (Progress.postgame) {
                    flavour_texts.push(...[
                        new WeightedString('Legend speaks of a league of elite miners...', 10)
                    ])
                }

                if (Statistics.rounds_played > 300) {
                    flavour_texts.push(...[
                        new WeightedString('You feel like you\'re being watched...', 10)
                    ])
                }

                flavour_text = get_weighted_random(flavour_texts).value
            }
        }
    }

    const flavour_text_element = document.createElement(element_type)
    flavour_text_element.classList.add('inverted-text')
    flavour_text_element.innerHTML = flavour_text
    return flavour_text_element
}